package app.kguitar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.DisplayMetrics;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

/**
 * Screen grab for the Riff Scanner: while a video plays in KGuitar, captures full-resolution frames cropped directly to
 * the YouTube video player rectangle (zero surrounding UI chrome!) and records internal playback audio (Android 10+)
 * with proper Android 14-16 mediaProjection|microphone foreground service types and real per-frame timestamps.
 */
public class ScreenGrabService extends Service {
    static ScreenGrabService instance;
    /** what the consent dialog returned, handed over by ScreenGrabPlugin */
    static int resultCode;
    static Intent resultData;
    static int fps = 2;
    static int maxSeconds = 120;
    static boolean wantAudio = true;
    /** Optional crop rectangle in physical display pixels (computed from WebView DOM rect) */
    static int cropScreenX = 0, cropScreenY = 0, cropScreenW = 0, cropScreenH = 0;
    static void clearCrop() { cropScreenX = cropScreenY = cropScreenW = cropScreenH = 0; }
    /** told when capture has started ("ok" or "error: ...") */
    static java.util.function.Consumer<String> onStarted;
    /** told when capture stops by itself (time up, or stopped from the notification / Android) */
    static Runnable onStoppedByItself;

    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader reader;
    private HandlerThread thread;
    private Handler handler;
    private AudioRecord audio;
    private Thread audioThread;
    private volatile boolean running = false;
    private final List<String> frames = new ArrayList<>();
    private final List<Double> times = new ArrayList<>();
    private File dir;
    private File wav;
    private long started;
    private int width, height;
    private int outW, outH;
    private int cropX, cropY, cropW, cropH;
    private long pcmBytes = 0;
    private volatile String lastAudioErr = null;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        instance = this;
        String ch = "kguitar-scan";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) nm.createNotificationChannel(new NotificationChannel(ch, "Riff Scanner", NotificationManager.IMPORTANCE_LOW));
        Notification n = new NotificationCompat.Builder(this, ch)
            .setSmallIcon(R.drawable.ic_stat_kguitar)
            .setContentTitle("KGuitar is scanning the video")
            .setContentText("Reading the tab on screen and listening to its sound")
            .setOngoing(true)
            .build();
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                boolean hasMic = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                int fgsType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION;
                if (wantAudio && hasMic) fgsType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
                startForeground(7, n, fgsType);
            } else if (Build.VERSION.SDK_INT >= 29) {
                startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            } else {
                startForeground(7, n);
            }
            begin();
        } catch (Exception e) {
            tell("error: " + e.getMessage());
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private void tell(String s) {
        java.util.function.Consumer<String> f = onStarted;
        onStarted = null;
        if (f != null) f.accept(s);
    }

    private void begin() throws IOException {
        MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm == null || resultData == null) { tell("error: no screen capture"); stopSelf(); return; }
        projection = mpm.getMediaProjection(resultCode, resultData);
        resultData = null; // a consent can only be used once
        if (projection == null) { tell("error: refused"); stopSelf(); return; }
        thread = new HandlerThread("kguitar-grab");
        thread.start();
        handler = new Handler(thread.getLooper());
        projection.registerCallback(new MediaProjection.Callback() {
            @Override public void onStop() { if (running) { finishCapture(); Runnable r = onStoppedByItself; if (r != null) r.run(); } }
        }, handler);

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int physW = dm.widthPixels, physH = dm.heightPixels;
        android.view.WindowManager wmgr = (android.view.WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (wmgr != null) {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Rect b = wmgr.getCurrentWindowMetrics().getBounds();
                physW = b.width();
                physH = b.height();
            } else {
                DisplayMetrics real = new DisplayMetrics();
                wmgr.getDefaultDisplay().getRealMetrics(real);
                physW = real.widthPixels;
                physH = real.heightPixels;
            }
        }
        // Keep full native resolution up to 2400px so cropped Shorts/videos stay razor-sharp (1080p!)
        float k = Math.min(1f, 2400f / Math.max(physW, physH));
        width = Math.max(2, Math.round(physW * k) & ~1);
        height = Math.max(2, Math.round(physH * k) & ~1);

        // Scale optional video-player crop rect into virtual display coordinates
        if (cropScreenW > 0 && cropScreenH > 0) {
            cropX = Math.max(0, Math.min(width - 2, Math.round(cropScreenX * k)));
            cropY = Math.max(0, Math.min(height - 2, Math.round(cropScreenY * k)));
            cropW = Math.max(2, Math.min(width - cropX, Math.round(cropScreenW * k)));
            cropH = Math.max(2, Math.min(height - cropY, Math.round(cropScreenH * k)));
            outW = cropW;
            outH = cropH;
        } else {
            cropX = cropY = cropW = cropH = 0;
            outW = width;
            outH = height;
        }

        dir = new File(getCacheDir(), "scan");
        if (dir.exists()) { File[] old = dir.listFiles(); if (old != null) for (File f : old) f.delete(); } else dir.mkdirs();
        reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        display = projection.createVirtualDisplay("kguitar-scan", width, height, dm.densityDpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader.getSurface(), null, handler);
        running = true;
        started = System.currentTimeMillis();
        frames.clear();
        times.clear();
        lastAudioErr = null;
        if (wantAudio) startAudio();
        handler.postDelayed(grab, 250);
        tell("ok");
    }

    private final Runnable grab = new Runnable() {
        @Override public void run() {
            if (!running) return;
            Image img = null;
            try {
                img = reader.acquireLatestImage();
                if (img != null) {
                    double tSec = (System.currentTimeMillis() - started) / 1000.0;
                    Image.Plane p = img.getPlanes()[0];
                    ByteBuffer buf = p.getBuffer();
                    int pixelStride = p.getPixelStride(), rowStride = p.getRowStride();
                    int padded = rowStride / pixelStride;
                    Bitmap bmp = Bitmap.createBitmap(padded, height, Bitmap.Config.ARGB_8888);
                    bmp.copyPixelsFromBuffer(buf);

                    int sx = cropW > 0 ? cropX : 0;
                    int sy = cropH > 0 ? cropY : 0;
                    int sw = cropW > 0 ? cropW : width;
                    int sh = cropH > 0 ? cropH : height;
                    sx = Math.max(0, Math.min(padded - 2, sx));
                    sy = Math.max(0, Math.min(height - 2, sy));
                    sw = Math.max(2, Math.min(padded - sx, sw));
                    sh = Math.max(2, Math.min(height - sy, sh));

                    Bitmap cropped = (sx == 0 && sy == 0 && sw == padded && sh == height)
                        ? bmp
                        : Bitmap.createBitmap(bmp, sx, sy, sw, sh);

                    // Cap cropped frame width at 1440px (keeps 1080p Shorts crisp while saving fast)
                    Bitmap out = cropped;
                    if (cropped.getWidth() > 1440) {
                        int tw = 1440;
                        int th = Math.max(2, Math.round(cropped.getHeight() * (1440f / cropped.getWidth())));
                        out = Bitmap.createScaledBitmap(cropped, tw, th, true);
                    }
                    outW = out.getWidth();
                    outH = out.getHeight();

                    File f = new File(dir, String.format("f%05d.jpg", frames.size()));
                    // High-quality JPEG 96 eliminates compression ringing around thin tab lines and small digits
                    try (FileOutputStream os = new FileOutputStream(f)) { out.compress(Bitmap.CompressFormat.JPEG, 96, os); }
                    frames.add(f.getAbsolutePath());
                    times.add(tSec);

                    if (out != cropped) out.recycle();
                    if (cropped != bmp) cropped.recycle();
                    bmp.recycle();
                }
            } catch (Exception ignored) {
            } finally { if (img != null) img.close(); }
            if ((System.currentTimeMillis() - started) / 1000 >= maxSeconds) {
                finishCapture();
                Runnable r = onStoppedByItself;
                if (r != null) r.run();
                return;
            }
            handler.postDelayed(this, 1000 / Math.max(1, fps));
        }
    };

    private void startAudio() {
        if (Build.VERSION.SDK_INT < 29) { lastAudioErr = "android<10"; return; }
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            lastAudioErr = "permission";
            return;
        }
        try {
            AudioPlaybackCaptureConfiguration cfg = new AudioPlaybackCaptureConfiguration.Builder(projection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build();
            int rate = 44100;
            AudioFormat fmt = new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_IN_MONO).build();
            int min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            audio = new AudioRecord.Builder().setAudioFormat(fmt).setBufferSizeInBytes(Math.max(min * 4, 16384)).setAudioPlaybackCaptureConfig(cfg).build();
            if (audio.getState() != AudioRecord.STATE_INITIALIZED) {
                lastAudioErr = "init_failed";
                audio.release();
                audio = null;
                return;
            }
            wav = new File(dir, "sound.wav");
            final RandomAccessFile out = new RandomAccessFile(wav, "rw");
            out.setLength(0);
            out.write(new byte[44]); // header written at the end
            pcmBytes = 0;
            audio.startRecording();
            audioThread = new Thread(() -> {
                byte[] b = new byte[8192];
                try {
                    while (running) {
                        int n = audio.read(b, 0, b.length);
                        if (n > 0) { out.write(b, 0, n); pcmBytes += n; }
                    }
                    writeHeader(out, rate, pcmBytes);
                    out.close();
                } catch (IOException e) {
                    lastAudioErr = "io:" + e.getMessage();
                }
            }, "kguitar-grab-audio");
            audioThread.start();
        } catch (Exception e) {
            lastAudioErr = e.getClass().getSimpleName() + ": " + e.getMessage();
            audio = null;
            wav = null;
        }
    }

    private static void writeHeader(RandomAccessFile f, int rate, long data) throws IOException {
        f.seek(0);
        ByteBuffer h = ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        h.put("RIFF".getBytes()).putInt((int) (36 + data)).put("WAVE".getBytes());
        h.put("fmt ".getBytes()).putInt(16).putShort((short) 1).putShort((short) 1).putInt(rate).putInt(rate * 2).putShort((short) 2).putShort((short) 16);
        h.put("data".getBytes()).putInt((int) data);
        f.write(h.array());
    }

    /** Stop capturing (keeps the files). Safe to call twice. */
    synchronized void finishCapture() {
        if (!running) return;
        running = false;
        if (handler != null) handler.removeCallbacks(grab);
        try { if (audio != null) audio.stop(); } catch (Exception ignored) { }
        try { if (audioThread != null) audioThread.join(1500); } catch (InterruptedException ignored) { }
        try { if (audio != null) audio.release(); } catch (Exception ignored) { }
        audio = null;
        try { if (display != null) display.release(); } catch (Exception ignored) { }
        display = null;
        try { if (reader != null) reader.close(); } catch (Exception ignored) { }
        reader = null;
        try { if (projection != null) projection.stop(); } catch (Exception ignored) { }
        projection = null;
    }

    boolean isAudioCapturing() { return audio != null && lastAudioErr == null; }
    String audioError() { return lastAudioErr; }
    List<String> frameFiles() { return new ArrayList<>(frames); }
    List<Double> frameTimes() { return new ArrayList<>(times); }
    String soundFile() { return wav != null && wav.exists() && pcmBytes > 0 ? wav.getAbsolutePath() : null; }
    int frameWidth() { return outW; }
    int frameHeight() { return outH; }

    @Override
    public void onDestroy() {
        finishCapture();
        if (thread != null) thread.quitSafely();
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
