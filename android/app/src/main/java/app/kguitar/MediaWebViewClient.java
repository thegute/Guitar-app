package app.kguitar;

import android.content.ContentResolver;
import android.content.Context;
import android.content.UriPermission;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Plays your lesson videos, PDFs, diagrams and backing tracks inside the app:
 * requests to https://localhost/_kg_media_?u=<uri> (or legacy /_kg_media_/<uri>) are answered directly
 * from the phone's storage with O(1) FileChannel byte-range seeking (critical for MP4 files whose moov
 * atom sits at the end of the file, and for jumping anywhere in long videos).
 */
public class MediaWebViewClient extends BridgeWebViewClient {

    static final String PREFIX = "/_kg_media_/";
    static final String EXACT_PATH = "/_kg_media_";
    /** Tree URIs granted during this app session (covers providers where persistable permission isn't supported). */
    private static final Set<String> SESSION_TREES = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Context ctx;

    public MediaWebViewClient(Bridge bridge) {
        super(bridge);
        this.ctx = bridge.getContext();
    }

    static void grantSessionTree(Uri tree) {
        if (tree != null) SESSION_TREES.add(normUri(tree.toString()));
    }

    static void revokeSessionTree(String tree) {
        if (tree != null) SESSION_TREES.remove(normUri(tree));
    }

    private static String normUri(String s) {
        if (s == null) return "";
        // Normalize percent-encoding hex digits to uppercase so %2f == %2F and %3a == %3A
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '%' && i + 2 < s.length()) {
                out.append('%')
                    .append(Character.toUpperCase(s.charAt(i + 1)))
                    .append(Character.toUpperCase(s.charAt(i + 2)));
                i += 2;
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        if (url != null) {
            String path = url.getEncodedPath();
            if (EXACT_PATH.equals(path)) {
                String u = url.getQueryParameter("u");
                if (u != null && !u.isEmpty()) return serve(request, Uri.parse(u));
            }
            if (path != null && path.startsWith(PREFIX)) {
                String tail = path.substring(PREFIX.length());
                if (!tail.isEmpty()) return serve(request, Uri.parse(Uri.decode(tail)));
                String u = url.getQueryParameter("u");
                if (u != null && !u.isEmpty()) return serve(request, Uri.parse(u));
            }
        }
        return super.shouldInterceptRequest(view, request);
    }

    private static boolean matchesTree(String docUriNorm, String treeUriNorm, Uri docUri) {
        if (docUriNorm.startsWith(treeUriNorm + "/document/")) return true;
        if (docUriNorm.equals(treeUriNorm)) return true;
        try {
            Uri tree = Uri.parse(treeUriNorm);
            if (tree.getAuthority() != null && tree.getAuthority().equals(docUri.getAuthority())) {
                String docTreeId = DocumentsContract.getTreeDocumentId(docUri);
                String grantedTreeId = DocumentsContract.getTreeDocumentId(tree);
                if (docTreeId != null && docTreeId.equals(grantedTreeId)) return true;
            }
        } catch (Exception ignored) {
            // non-tree URI
        }
        return false;
    }

    /** A file the app may read: inside a folder (tree) you picked and still have permission for. */
    static boolean allowed(Context ctx, Uri uri) {
        if (uri == null || !"content".equals(uri.getScheme())) return false;
        String s = normUri(uri.toString());
        for (UriPermission p : ctx.getContentResolver().getPersistedUriPermissions()) {
            if (p.isReadPermission() && matchesTree(s, normUri(p.getUri().toString()), uri)) return true;
        }
        for (String treeNorm : SESSION_TREES) {
            if (matchesTree(s, treeNorm, uri)) return true;
        }
        return false;
    }

    private WebResourceResponse serve(WebResourceRequest request, Uri uri) {
        if (!allowed(ctx, uri)) return plain(403, "Forbidden");
        ContentResolver cr = ctx.getContentResolver();
        long size = -1;
        String displayName = null;
        try (Cursor c = cr.query(uri, new String[] { OpenableColumns.SIZE, OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                if (!c.isNull(0)) size = c.getLong(0);
                if (!c.isNull(1)) displayName = c.getString(1);
            }
        } catch (Exception e) {
            // fallback to AssetFileDescriptor length below
        }
        String mime = cr.getType(uri);
        if (mime == null || mime.isEmpty() || "application/octet-stream".equalsIgnoreCase(mime) || "*/*".equals(mime)) {
            mime = guess(displayName != null ? displayName : uri.getLastPathSegment());
        }

        AssetFileDescriptor afd = null;
        InputStream in = null;
        try {
            try {
                afd = cr.openAssetFileDescriptor(uri, "r");
            } catch (Exception ignored) {
                afd = null;
            }
            if (size < 0 && afd != null && afd.getLength() >= 0) {
                size = afd.getLength();
            }
            FileInputStream preFis = null;
            if (size < 0 && afd != null) {
                try {
                    preFis = afd.createInputStream();
                    long chSize = preFis.getChannel().size();
                    if (chSize > 0) size = chSize;
                } catch (Exception ignored) {
                    closeQuietly(preFis);
                    preFis = null;
                }
            }

            if ("HEAD".equalsIgnoreCase(request.getMethod())) {
                closeQuietly(preFis);
                closeQuietly(afd);
                Map<String, String> h = new HashMap<>();
                h.put("Accept-Ranges", "bytes");
                h.put("Cache-Control", "no-store");
                if (size >= 0) h.put("Content-Length", String.valueOf(size));
                return new WebResourceResponse(mime, null, 200, "OK", h, new ByteArrayInputStream(new byte[0]));
            }

            String range = header(request, "Range");
            long from = 0;
            long to = size > 0 ? size - 1 : -1;
            boolean partial = false;
            if (range != null && size > 0 && range.startsWith("bytes=")) {
                String[] parts = range.substring(6).split(",")[0].trim().split("-", -1);
                try {
                    if (parts[0].isEmpty()) { // suffix range: last N bytes
                        long n = Long.parseLong(parts[1]);
                        from = Math.max(0, size - n);
                    } else {
                        from = Long.parseLong(parts[0]);
                        if (parts.length > 1 && !parts[1].isEmpty()) to = Math.min(size - 1, Long.parseLong(parts[1]));
                    }
                    partial = true;
                } catch (NumberFormatException e) {
                    from = 0;
                    to = size - 1;
                }
                if (from >= size || to < from) {
                    closeQuietly(preFis);
                    closeQuietly(afd);
                    Map<String, String> h = new HashMap<>();
                    h.put("Content-Range", "bytes */" + size);
                    return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", h, new ByteArrayInputStream(new byte[0]));
                }
            }

            if (afd != null) {
                FileInputStream fis = preFis != null ? preFis : afd.createInputStream();
                if (from > 0) {
                    try {
                        long baseOffset = Math.max(0, afd.getStartOffset());
                        fis.getChannel().position(baseOffset + from);
                    } catch (IOException seekErr) {
                        discardBytes(fis, from);
                    }
                }
                in = fis;
            } else {
                in = cr.openInputStream(uri);
                if (in == null) return plain(404, "Not Found");
                if (from > 0) discardBytes(in, from);
            }

            Map<String, String> h = new HashMap<>();
            h.put("Accept-Ranges", "bytes");
            h.put("Cache-Control", "no-store");
            if (partial) {
                long len = to - from + 1;
                h.put("Content-Range", "bytes " + from + "-" + to + "/" + size);
                h.put("Content-Length", String.valueOf(len));
                return new WebResourceResponse(mime, null, 206, "Partial Content", h, new Bounded(in, afd, len));
            }
            if (size >= 0) h.put("Content-Length", String.valueOf(size));
            return new WebResourceResponse(mime, null, 200, "OK", h, new Bounded(in, afd, size >= 0 ? size : Long.MAX_VALUE));
        } catch (IOException | SecurityException e) {
            closeQuietly(in);
            closeQuietly(afd);
            return plain(404, "Not Found");
        }
    }

    /** Reliable skip fallback for non-seekable streams where InputStream.skip() may return 0. */
    private static void discardBytes(InputStream in, long count) throws IOException {
        long left = count;
        byte[] trash = new byte[16384];
        while (left > 0) {
            long k = in.skip(left);
            if (k > 0) {
                left -= k;
                continue;
            }
            int r = in.read(trash, 0, (int) Math.min(trash.length, left));
            if (r <= 0) break;
            left -= r;
        }
    }

    private static void closeQuietly(AutoCloseable c) {
        if (c != null) {
            try {
                c.close();
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    private static String header(WebResourceRequest r, String name) {
        Map<String, String> h = r.getRequestHeaders();
        if (h == null) return null;
        for (Map.Entry<String, String> e : h.entrySet()) if (e.getKey() != null && e.getKey().equalsIgnoreCase(name)) return e.getValue();
        return null;
    }

    private static String guess(String name) {
        String n = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".mp4") || n.endsWith(".m4v") || n.endsWith(".mov")) return "video/mp4";
        if (n.endsWith(".webm")) return "video/webm";
        if (n.endsWith(".mkv")) return "video/x-matroska";
        if (n.endsWith(".ts") || n.endsWith(".m2ts")) return "video/mp2t";
        if (n.endsWith(".mp3")) return "audio/mpeg";
        if (n.endsWith(".wav")) return "audio/wav";
        if (n.endsWith(".m4a")) return "audio/mp4";
        if (n.endsWith(".ogg")) return "audio/ogg";
        if (n.endsWith(".flac")) return "audio/flac";
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".webp")) return "image/webp";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".gif")) return "image/gif";
        if (n.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private static WebResourceResponse plain(int code, String reason) {
        return new WebResourceResponse("text/plain", "utf-8", code, reason, new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    /** Stops after `left` bytes (one byte range) and closes both InputStream and AssetFileDescriptor cleanly. */
    private static class Bounded extends InputStream {
        private final InputStream in;
        private final AssetFileDescriptor afd;
        private long left;

        Bounded(InputStream in, AssetFileDescriptor afd, long left) {
            this.in = in;
            this.afd = afd;
            this.left = left;
        }

        @Override
        public int read() throws IOException {
            if (left <= 0) return -1;
            int b = in.read();
            if (b >= 0) left--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (left <= 0) return -1;
            int n = in.read(b, off, (int) Math.min(len, left));
            if (n > 0) left -= n;
            return n;
        }

        @Override
        public void close() throws IOException {
            try {
                in.close();
            } finally {
                closeQuietly(afd);
            }
        }
    }
}
