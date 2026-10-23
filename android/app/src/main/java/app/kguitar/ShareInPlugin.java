package app.kguitar;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;

/**
 * Receives things shared into KGuitar from other apps (Share → KGuitar): text such as a copied tab or chord sheet,
 * links (YouTube), and files (Guitar Pro or text tabs). The web app picks them up with ShareIn.take().
 */
@CapacitorPlugin(name = "ShareIn")
public class ShareInPlugin extends Plugin {

    private static final int MAX_BYTES = 20 * 1024 * 1024;
    private JSObject pending = null;

    @Override
    protected void handleOnNewIntent(Intent intent) {
        JSObject data = read(intent);
        if (data == null) {
            return;
        }
        pending = data;
        notifyListeners("shared", new JSObject(), true);
    }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject ret = new JSObject();
        if (pending != null) {
            ret.put("item", pending);
            pending = null;
        }
        call.resolve(ret);
    }

    private JSObject read(Intent intent) {
        if (intent == null) {
            return null;
        }
        String action = intent.getAction();
        boolean send = Intent.ACTION_SEND.equals(action);
        boolean multiple = Intent.ACTION_SEND_MULTIPLE.equals(action);
        if (!send && !multiple) {
            return null;
        }
        JSObject out = new JSObject();
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (text != null) {
            out.put("text", text);
        }
        if (subject != null) {
            out.put("subject", subject);
        }
        ArrayList<Uri> uris = new ArrayList<>();
        if (send) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (u != null) {
                uris.add(u);
            }
        } else {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) {
                uris.addAll(list);
            }
        }
        JSArray files = new JSArray();
        for (Uri u : uris) {
            JSObject f = readFile(u);
            if (f != null) {
                files.put(f);
            }
        }
        if (files.length() > 0) {
            out.put("files", files);
        }
        // handled: don't deliver the same share again if the activity is recreated
        intent.setAction(null);
        if (text == null && files.length() == 0) {
            return null;
        }
        return out;
    }

    private JSObject readFile(Uri uri) {
        String name = "shared-file";
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0 && c.getString(i) != null) {
                    name = c.getString(i);
                }
            }
        } catch (Exception ignored) {
            // no name available: keep the default
        }
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) {
                return null;
            }
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[16384];
            int n;
            int total = 0;
            while ((n = in.read(chunk)) != -1) {
                buf.write(chunk, 0, n);
                total += n;
                if (total > MAX_BYTES) {
                    return null;
                }
            }
            JSObject f = new JSObject();
            f.put("name", name);
            String mime = getContext().getContentResolver().getType(uri);
            f.put("mime", mime == null ? "" : mime);
            f.put("data", Base64.encodeToString(buf.toByteArray(), Base64.NO_WRAP));
            return f;
        } catch (Exception e) {
            return null;
        }
    }
}
