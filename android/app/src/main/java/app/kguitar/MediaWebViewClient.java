package app.kguitar;

import android.content.ContentResolver;
import android.content.Context;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Plays your lesson videos inside the app: requests to https://localhost/_kg_media_/<file> are answered from the
 * phone's storage, with byte ranges so you can jump anywhere in a long video. Only files inside a folder you picked
 * in "Your video lessons" are served; everything else goes to Capacitor as usual.
 */
public class MediaWebViewClient extends BridgeWebViewClient {

    static final String PREFIX = "/_kg_media_/";
    private final Context ctx;

    public MediaWebViewClient(Bridge bridge) {
        super(bridge);
        this.ctx = bridge.getContext();
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String path = request.getUrl().getEncodedPath();
        if (path != null && path.startsWith(PREFIX)) return serve(request, path.substring(PREFIX.length()));
        return super.shouldInterceptRequest(view, request);
    }

    /** A file the app may read: built from a folder (tree) you picked and still have permission for. */
    static boolean allowed(Context ctx, Uri uri) {
        if (uri == null || !"content".equals(uri.getScheme())) return false;
        String s = uri.toString();
        for (UriPermission p : ctx.getContentResolver().getPersistedUriPermissions()) {
            if (p.isReadPermission() && s.startsWith(p.getUri().toString() + "/document/")) return true;
        }
        return false;
    }

    private WebResourceResponse serve(WebResourceRequest request, String encoded) {
        Uri uri = Uri.parse(Uri.decode(encoded));
        if (!allowed(ctx, uri)) return plain(403, "Forbidden");
        ContentResolver cr = ctx.getContentResolver();
        long size = -1;
        try (Cursor c = cr.query(uri, new String[] { OpenableColumns.SIZE }, null, null, null)) {
            if (c != null && c.moveToFirst() && !c.isNull(0)) size = c.getLong(0);
        } catch (Exception e) {
            // unknown size: served whole, no seeking
        }
        String mime = cr.getType(uri);
        if (mime == null) mime = guess(uri.getLastPathSegment());
        String range = header(request, "Range");
        long from = 0, to = size - 1;
        boolean partial = false;
        if (range != null && size > 0 && range.startsWith("bytes=")) {
            String[] parts = range.substring(6).split(",")[0].trim().split("-", -1);
            try {
                if (parts[0].isEmpty()) { // the last N bytes
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
            if (from >= size) {
                Map<String, String> h = new HashMap<>();
                h.put("Content-Range", "bytes */" + size);
                return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", h, new ByteArrayInputStream(new byte[0]));
            }
        }
        try {
            InputStream in = cr.openInputStream(uri);
            if (in == null) return plain(404, "Not Found");
            long skip = from;
            while (skip > 0) {
                long k = in.skip(skip);
                if (k <= 0) break;
                skip -= k;
            }
            Map<String, String> h = new HashMap<>();
            h.put("Accept-Ranges", "bytes");
            h.put("Cache-Control", "no-store");
            if (partial) {
                long len = to - from + 1;
                h.put("Content-Range", "bytes " + from + "-" + to + "/" + size);
                h.put("Content-Length", String.valueOf(len));
                return new WebResourceResponse(mime, null, 206, "Partial Content", h, new Bounded(in, len));
            }
            if (size >= 0) h.put("Content-Length", String.valueOf(size));
            return new WebResourceResponse(mime, null, 200, "OK", h, in);
        } catch (IOException | SecurityException e) {
            return plain(404, "Not Found");
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
        if (n.endsWith(".mp4") || n.endsWith(".m4v")) return "video/mp4";
        if (n.endsWith(".webm")) return "video/webm";
        if (n.endsWith(".mov")) return "video/quicktime";
        if (n.endsWith(".mkv")) return "video/x-matroska";
        if (n.endsWith(".mp3")) return "audio/mpeg";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private static WebResourceResponse plain(int code, String reason) {
        return new WebResourceResponse("text/plain", "utf-8", code, reason, new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    /** Stops after `left` bytes (one byte range). */
    private static class Bounded extends InputStream {
        private final InputStream in;
        private long left;

        Bounded(InputStream in, long left) {
            this.in = in;
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
            in.close();
        }
    }
}
