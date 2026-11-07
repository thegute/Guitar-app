package app.kguitar;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * The Riff Scanner's music models on the phone itself (ONNX Runtime for Android, several cores): the guitar-note model
 * and the Beat This! beat tracker. Models are downloaded once into the app's own storage (checked against their
 * SHA-256), opened when needed, and run on a background thread. Audio and results cross as base64 (little-endian
 * float32 in; note outputs come back as uint16 0..65535 = 0..1, beat logits as float32).
 */
@CapacitorPlugin(name = "Ml")
public class MlPlugin extends Plugin {
    private final ExecutorService runner = Executors.newSingleThreadExecutor();
    private final ExecutorService fetcher = Executors.newSingleThreadExecutor();
    private final Map<String, OrtSession> sessions = new HashMap<>();
    private OrtEnvironment env;
    private volatile boolean cancelFetch = false;

    private File dir() {
        File d = new File(getContext().getFilesDir(), "models");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /** Which of these files are here (and the right size). */
    @PluginMethod
    public void status(PluginCall call) {
        JSArray files = call.getArray("files");
        JSArray have = new JSArray();
        try {
            for (int i = 0; i < files.length(); i++) {
                JSONObject f = files.getJSONObject(i);
                File x = new File(dir(), f.getString("name"));
                if (x.exists() && x.length() == f.getLong("bytes") && new File(dir(), f.getString("name") + ".ok").exists()) have.put(f.getString("name"));
            }
        } catch (Exception ignored) { }
        JSObject r = new JSObject();
        r.put("have", have);
        call.resolve(r);
    }

    /** Download the files (skips ones already here), with "progress" events; every file is checked against its SHA-256. */
    @PluginMethod
    public void download(PluginCall call) {
        cancelFetch = false;
        JSArray files = call.getArray("files");
        fetcher.execute(() -> {
            try {
                long total = 0, done = 0;
                for (int i = 0; i < files.length(); i++) total += files.getJSONObject(i).getLong("bytes");
                for (int i = 0; i < files.length(); i++) {
                    JSONObject f = files.getJSONObject(i);
                    String name = f.getString("name");
                    long bytes = f.getLong("bytes");
                    File out = new File(dir(), name), ok = new File(dir(), name + ".ok");
                    if (out.exists() && out.length() == bytes && ok.exists()) { done += bytes; continue; }
                    File part = new File(dir(), name + ".part");
                    MessageDigest sha = MessageDigest.getInstance("SHA-256");
                    HttpURLConnection c = (HttpURLConnection) new URL(f.getString("url")).openConnection();
                    c.setInstanceFollowRedirects(true);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(60000);
                    if (c.getResponseCode() >= 300) throw new Exception("HTTP " + c.getResponseCode());
                    try (InputStream in = c.getInputStream(); FileOutputStream os = new FileOutputStream(part)) {
                        byte[] buf = new byte[1 << 16];
                        int n;
                        long last = 0;
                        while ((n = in.read(buf)) > 0) {
                            if (cancelFetch) throw new Exception("cancelled");
                            os.write(buf, 0, n);
                            sha.update(buf, 0, n);
                            done += n;
                            if (done - last > 1 << 20) {
                                last = done;
                                JSObject p = new JSObject();
                                p.put("done", done);
                                p.put("total", total);
                                notifyListeners("progress", p);
                            }
                        }
                    } finally { c.disconnect(); }
                    StringBuilder hex = new StringBuilder();
                    for (byte b : sha.digest()) hex.append(String.format("%02x", b));
                    if (!hex.toString().equals(f.getString("sha256"))) { part.delete(); throw new Exception("checksum"); }
                    if (out.exists()) out.delete();
                    if (!part.renameTo(out)) throw new Exception("rename");
                    new FileOutputStream(ok).close();
                }
                JSObject r = new JSObject();
                r.put("ok", true);
                call.resolve(r);
            } catch (Exception e) {
                JSObject r = new JSObject();
                r.put("ok", false);
                r.put("error", String.valueOf(e.getMessage()));
                call.resolve(r);
            }
        });
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) { cancelFetch = true; call.resolve(); }

    @PluginMethod
    public void remove(PluginCall call) {
        runner.execute(() -> {
            for (OrtSession s : sessions.values()) { try { s.close(); } catch (Exception ignored) { } }
            sessions.clear();
            File[] all = dir().listFiles();
            if (all != null) for (File f : all) f.delete();
            call.resolve();
        });
    }

    /** Open a model file (once): `id` names it for runNotes / runBeats. */
    @PluginMethod
    public void load(PluginCall call) {
        String id = call.getString("id"), file = call.getString("file");
        runner.execute(() -> {
            try {
                if (!sessions.containsKey(id)) {
                    if (env == null) env = OrtEnvironment.getEnvironment();
                    OrtSession.SessionOptions o = new OrtSession.SessionOptions();
                    int cores = Runtime.getRuntime().availableProcessors();
                    o.setIntraOpNumThreads(Math.max(1, Math.min(4, cores - 1)));
                    o.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                    sessions.put(id, env.createSession(new File(dir(), file).getAbsolutePath(), o));
                }
                JSObject r = new JSObject();
                r.put("ok", true);
                call.resolve(r);
            } catch (Exception e) {
                JSObject r = new JSObject();
                r.put("ok", false);
                r.put("error", String.valueOf(e.getMessage()));
                call.resolve(r);
            }
        });
    }

    @PluginMethod
    public void unload(PluginCall call) {
        String id = call.getString("id");
        runner.execute(() -> {
            OrtSession s = sessions.remove(id);
            if (s != null) { try { s.close(); } catch (Exception ignored) { } }
            call.resolve();
        });
    }

    private static float[] floats(String b64) {
        byte[] b = Base64.decode(b64, Base64.DEFAULT);
        FloatBuffer fb = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer();
        float[] f = new float[fb.remaining()];
        fb.get(f);
        return f;
    }

    private static String asUint16(FloatBuffer fb) {
        ByteBuffer out = ByteBuffer.allocate(fb.remaining() * 2).order(ByteOrder.LITTLE_ENDIAN);
        while (fb.hasRemaining()) {
            float v = Math.max(0f, Math.min(1f, fb.get()));
            out.putShort((short) Math.round(v * 65535f));
        }
        return Base64.encodeToString(out.array(), Base64.NO_WRAP);
    }

    private static String asFloat32(FloatBuffer fb) {
        ByteBuffer out = ByteBuffer.allocate(fb.remaining() * 4).order(ByteOrder.LITTLE_ENDIAN);
        while (fb.hasRemaining()) out.putFloat(fb.get());
        return Base64.encodeToString(out.array(), Base64.NO_WRAP);
    }

    /** One 10 s chunk of 16 kHz audio through the guitar-note model. */
    @PluginMethod
    public void runNotes(PluginCall call) {
        String id = call.getString("id"), data = call.getString("data");
        runner.execute(() -> {
            try {
                OrtSession s = sessions.get(id);
                if (s == null) throw new Exception("not loaded");
                long t0 = System.currentTimeMillis();
                float[] x = floats(data);
                try (OnnxTensor in = OnnxTensor.createTensor(env, FloatBuffer.wrap(x), new long[] { 1, x.length });
                     OrtSession.Result r = s.run(Collections.singletonMap("waveform", in))) {
                    JSObject o = new JSObject();
                    String[] names = { "reg_onset_output", "reg_offset_output", "frame_output", "velocity_output" };
                    String[] keys = { "onset", "offset", "frame", "velocity" };
                    for (int i = 0; i < names.length; i++) {
                        OnnxTensor t = (OnnxTensor) r.get(names[i]).get();
                        o.put(keys[i], asUint16(t.getFloatBuffer()));
                    }
                    o.put("ms", System.currentTimeMillis() - t0);
                    call.resolve(o);
                }
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        });
    }

    /** One chunk of the log-mel spectrogram (frames × 128) through Beat This!. */
    @PluginMethod
    public void runBeats(PluginCall call) {
        String id = call.getString("id"), data = call.getString("data");
        int frames = call.getInt("frames", 0);
        runner.execute(() -> {
            try {
                OrtSession s = sessions.get(id);
                if (s == null) throw new Exception("not loaded");
                long t0 = System.currentTimeMillis();
                float[] x = floats(data);
                try (OnnxTensor in = OnnxTensor.createTensor(env, FloatBuffer.wrap(x), new long[] { 1, frames, 128 });
                     OrtSession.Result r = s.run(Collections.singletonMap("spect", in))) {
                    JSObject o = new JSObject();
                    o.put("beat", asFloat32(((OnnxTensor) r.get("beat").get()).getFloatBuffer()));
                    o.put("downbeat", asFloat32(((OnnxTensor) r.get("downbeat").get()).getFloatBuffer()));
                    o.put("ms", System.currentTimeMillis() - t0);
                    call.resolve(o);
                }
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (OrtSession s : sessions.values()) { try { s.close(); } catch (Exception ignored) { } }
        sessions.clear();
    }
}
