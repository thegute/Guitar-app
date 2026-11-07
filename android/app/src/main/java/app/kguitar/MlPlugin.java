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

    /** IEEE half precision, rounded to nearest even (Float.floatToFloat16 needs Android 15, so it's done here). */
    static short toHalf(float f) {
        int x = Float.floatToRawIntBits(f);
        int sign = (x >>> 16) & 0x8000;
        int e = (x >>> 23) & 0xff;
        int m = x & 0x7fffff;
        if (e == 0xff) return (short) (sign | 0x7c00 | (m != 0 ? 0x200 : 0)); // infinity / NaN
        int ne = e - 127 + 15;
        if (ne >= 0x1f) return (short) (sign | 0x7c00); // too big: infinity
        if (ne <= 0) { // subnormal half
            if (ne < -10) return (short) sign;
            m |= 0x800000;
            int shift = 14 - ne;
            int h = m >>> shift, rem = m & ((1 << shift) - 1), mid = 1 << (shift - 1);
            if (rem > mid || (rem == mid && (h & 1) != 0)) h++;
            return (short) (sign | h);
        }
        int h = (ne << 10) | (m >>> 13), rem = m & 0x1fff;
        if (rem > 0x1000 || (rem == 0x1000 && (h & 1) != 0)) h++; // a carry into the exponent is right (up to infinity)
        return (short) (sign | h);
    }
    private static String asHalf(FloatBuffer fb) {
        ByteBuffer out = ByteBuffer.allocate(fb.remaining() * 2).order(ByteOrder.LITTLE_ENDIAN);
        while (fb.hasRemaining()) out.putShort(toHalf(fb.get()));
        return Base64.encodeToString(out.array(), Base64.NO_WRAP);
    }

    /**
     * One 7.8 s segment through HT-Demucs (voice isolation / stems): x = [1,4,2048,336], xt = [1,2,343980] (float32,
     * prepared in the app). All four sources come back as half-precision floats (x_out [16,2048,336], xt_out [8,343980]).
     */
    @PluginMethod
    public void runStems(PluginCall call) {
        String id = call.getString("id"), xs = call.getString("x"), xts = call.getString("xt");
        runner.execute(() -> {
            try {
                OrtSession s = sessions.get(id);
                if (s == null) throw new Exception("not loaded");
                long t0 = System.currentTimeMillis();
                float[] x = floats(xs), xt = floats(xts);
                java.util.Map<String, OnnxTensor> in = new HashMap<>();
                try (OnnxTensor a = OnnxTensor.createTensor(env, FloatBuffer.wrap(x), new long[] { 1, 4, 2048, 336 });
                     OnnxTensor b = OnnxTensor.createTensor(env, FloatBuffer.wrap(xt), new long[] { 1, 2, 343980 })) {
                    in.put("x", a); in.put("xt", b);
                    try (OrtSession.Result r = s.run(in)) {
                        JSObject o = new JSObject();
                        o.put("x", asHalf(((OnnxTensor) r.get("x_out").get()).getFloatBuffer()));
                        o.put("xt", asHalf(((OnnxTensor) r.get("xt_out").get()).getFloatBuffer()));
                        o.put("ms", System.currentTimeMillis() - t0);
                        call.resolve(o);
                    }
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
