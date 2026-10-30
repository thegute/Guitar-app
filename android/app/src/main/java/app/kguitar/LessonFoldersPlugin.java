package app.kguitar;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.DocumentsContract.Document;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Your video lessons: pick a folder on the phone once (Android's own folder picker), and KGuitar can list and read
 * the videos and tabs in it where they are. Nothing is copied or uploaded; the permission stays until you remove the
 * folder in the app. Videos play through MediaWebViewClient, which serves only files inside a folder you picked.
 */
@CapacitorPlugin(name = "LessonFolders")
public class LessonFoldersPlugin extends Plugin {

    private static final int MAX_FILES = 5000;
    private static final int MAX_DEPTH = 6;
    private static final int MAX_READ = 25 * 1024 * 1024;

    @PluginMethod
    public void pick(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(call, i, "picked");
    }

    @ActivityCallback
    private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            r.put("cancelled", true);
            call.resolve(r);
            return;
        }
        Uri tree = data.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException e) {
            // still readable for now; it may need picking again after a restart
        }
        r.put("tree", tree.toString());
        r.put("name", treeName(tree));
        call.resolve(r);
    }

    private String treeName(Uri tree) {
        try {
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            try (Cursor c = getContext().getContentResolver().query(doc, new String[] { Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
                if (c != null && c.moveToFirst()) return c.getString(0);
            }
        } catch (Exception e) {
            // fall through
        }
        return "Lessons";
    }

    @PluginMethod
    public void list(PluginCall call) {
        String t = call.getString("tree");
        if (t == null) {
            call.reject("No folder");
            return;
        }
        new Thread(() -> {
            try {
                Uri tree = Uri.parse(t);
                JSArray files = new JSArray();
                walk(tree, DocumentsContract.getTreeDocumentId(tree), "", 0, files);
                JSObject r = new JSObject();
                r.put("files", files);
                call.resolve(r);
            } catch (SecurityException e) {
                call.reject("No permission for this folder any more: pick it again.");
            } catch (Exception e) {
                call.reject("Couldn't read the folder: " + e.getMessage());
            }
        }).start();
    }

    private void walk(Uri tree, String docId, String prefix, int depth, JSArray out) {
        ContentResolver cr = getContext().getContentResolver();
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, docId);
        String[] cols = { Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE, Document.COLUMN_SIZE, Document.COLUMN_LAST_MODIFIED };
        try (Cursor c = cr.query(children, cols, null, null, null)) {
            if (c == null) return;
            while (c.moveToNext() && out.length() < MAX_FILES) {
                String id = c.getString(0);
                String name = c.getString(1);
                String mime = c.getString(2);
                if (name == null || name.startsWith(".")) continue;
                if (Document.MIME_TYPE_DIR.equals(mime)) {
                    if (depth < MAX_DEPTH) walk(tree, id, prefix + name + "/", depth + 1, out);
                    continue;
                }
                JSObject f = new JSObject();
                f.put("path", prefix + name);
                f.put("name", name);
                f.put("mime", mime == null ? "" : mime);
                f.put("size", c.isNull(3) ? -1 : c.getLong(3));
                f.put("modified", c.isNull(4) ? 0 : c.getLong(4));
                f.put("uri", DocumentsContract.buildDocumentUriUsingTree(tree, id).toString());
                out.put(f);
            }
        }
    }

    /** Read a small file (a Guitar Pro or text tab) as base64. Only files inside a picked folder. */
    @PluginMethod
    public void read(PluginCall call) {
        String u = call.getString("uri");
        if (u == null || !MediaWebViewClient.allowed(getContext(), Uri.parse(u))) {
            call.reject("That file isn't in one of your lesson folders.");
            return;
        }
        new Thread(() -> {
            try (InputStream in = getContext().getContentResolver().openInputStream(Uri.parse(u))) {
                if (in == null) throw new Exception("can't open");
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                byte[] chunk = new byte[65536];
                int n;
                while ((n = in.read(chunk)) > 0) {
                    buf.write(chunk, 0, n);
                    if (buf.size() > MAX_READ) throw new Exception("too big");
                }
                JSObject r = new JSObject();
                r.put("data", Base64.encodeToString(buf.toByteArray(), Base64.NO_WRAP));
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Couldn't read the file: " + e.getMessage());
            }
        }).start();
    }

    /** Open a file (a PDF tab) in another app. */
    @PluginMethod
    public void openExternal(PluginCall call) {
        String u = call.getString("uri");
        String mime = call.getString("mime", "*/*");
        if (u == null || !MediaWebViewClient.allowed(getContext(), Uri.parse(u))) {
            call.reject("That file isn't in one of your lesson folders.");
            return;
        }
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(Uri.parse(u), mime);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("No app on the phone can open this kind of file.");
        }
    }

    /** Stop reading a folder (the app forgets it; the files stay where they are). */
    @PluginMethod
    public void forget(PluginCall call) {
        String t = call.getString("tree");
        if (t != null) {
            try {
                getContext().getContentResolver().releasePersistableUriPermission(Uri.parse(t), Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception e) {
                // already gone
            }
        }
        call.resolve();
    }

    /** The folders the app may still read. */
    @PluginMethod
    public void granted(PluginCall call) {
        JSArray out = new JSArray();
        for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
            if (p.isReadPermission()) out.put(p.getUri().toString());
        }
        JSObject r = new JSObject();
        r.put("trees", out);
        call.resolve(r);
    }
}
