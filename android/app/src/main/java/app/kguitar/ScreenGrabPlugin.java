package app.kguitar;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.view.View;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * The Riff Scanner's screen grab: asks Android for RECORD_AUDIO (for internal AudioPlaybackCapture) and screen-capture
 * permission, maps the WebView video player's DOM rect into exact physical display coordinates so only the crisp video
 * player is saved (never surrounding buttons/chrome), and records internal phone audio + per-frame timestamps.
 */
@CapacitorPlugin(
    name = "ScreenGrab",
    permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class ScreenGrabPlugin extends Plugin {

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", Build.VERSION.SDK_INT >= 21);
        r.put("sound", Build.VERSION.SDK_INT >= 29);
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        boolean wantAudio = call.getBoolean("sound", true);
        if (wantAudio && Build.VERSION.SDK_INT >= 29 && getPermissionState("audio") != PermissionState.GRANTED) {
            requestPermissionForAlias("audio", call, "audioPerm");
            return;
        }
        launchConsent(call);
    }

    @PermissionCallback
    private void audioPerm(PluginCall call) {
        // Proceed whether granted or denied (video-only capture still works if user declined audio permission)
        launchConsent(call);
    }

    private void launchConsent(PluginCall call) {
        MediaProjectionManager mpm = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm == null) {
            JSObject r = new JSObject();
            r.put("ok", false);
            r.put("error", "unavailable");
            call.resolve(r);
            return;
        }
        ScreenGrabService.fps = Math.max(1, Math.min(6, call.getInt("fps", 2)));
        ScreenGrabService.maxSeconds = Math.max(5, Math.min(600, call.getInt("seconds", 120)));
        ScreenGrabService.wantAudio = call.getBoolean("sound", true);

        // Map optional normalized WebView crop { x, y, w, h } into physical display pixels (read safely on UI thread)
        JSObject crop = call.getObject("crop", null);
        if (crop != null && getBridge() != null && getBridge().getWebView() != null && getActivity() != null) {
            final double cx = crop.optDouble("x", 0), cy = crop.optDouble("y", 0);
            final double cw = crop.optDouble("w", 0), ch = crop.optDouble("h", 0);
            final int[] rect = new int[4];
            final java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);
            getActivity().runOnUiThread(() -> {
                try {
                    View wv = getBridge().getWebView();
                    int[] loc = new int[2];
                    wv.getLocationOnScreen(loc);
                    int wvW = wv.getWidth(), wvH = wv.getHeight();
                    if (wvW > 0 && wvH > 0 && cw > 0.05 && ch > 0.05) {
                        rect[0] = loc[0] + (int) Math.round(cx * wvW);
                        rect[1] = loc[1] + (int) Math.round(cy * wvH);
                        rect[2] = (int) Math.round(cw * wvW);
                        rect[3] = (int) Math.round(ch * wvH);
                    }
                } finally {
                    latch.countDown();
                }
            });
            try { latch.await(500, java.util.concurrent.TimeUnit.MILLISECONDS); } catch (InterruptedException ignored) { }
            if (rect[2] > 0 && rect[3] > 0) {
                ScreenGrabService.cropScreenX = rect[0];
                ScreenGrabService.cropScreenY = rect[1];
                ScreenGrabService.cropScreenW = rect[2];
                ScreenGrabService.cropScreenH = rect[3];
            } else {
                ScreenGrabService.clearCrop();
            }
        } else {
            ScreenGrabService.clearCrop();
        }

        startActivityForResult(call, mpm.createScreenCaptureIntent(), "consent");
    }

    @ActivityCallback
    private void consent(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject r = new JSObject();
            r.put("ok", false);
            r.put("error", "refused");
            call.resolve(r);
            return;
        }
        ScreenGrabService.resultCode = result.getResultCode();
        ScreenGrabService.resultData = result.getData();
        ScreenGrabService.onStoppedByItself = () -> notifyListeners("stopped", new JSObject());
        ScreenGrabService.onStarted = s -> {
            JSObject r = new JSObject();
            r.put("ok", "ok".equals(s));
            if (!"ok".equals(s)) r.put("error", s);
            ScreenGrabService svcInst = ScreenGrabService.instance;
            if (svcInst != null) {
                r.put("audioOk", svcInst.isAudioCapturing());
                if (svcInst.audioError() != null) r.put("audioError", svcInst.audioError());
            }
            call.resolve(r);
        };
        Intent svc = new Intent(getContext(), ScreenGrabService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(svc);
            else getContext().startService(svc);
        } catch (Exception e) {
            ScreenGrabService.onStarted = null;
            JSObject r = new JSObject();
            r.put("ok", false);
            r.put("error", "error: " + e.getMessage());
            call.resolve(r);
        }
    }

    /** Stop and hand back what was grabbed. */
    @PluginMethod
    public void stop(PluginCall call) {
        ScreenGrabService s = ScreenGrabService.instance;
        JSObject r = new JSObject();
        if (s == null) {
            r.put("frames", new JSArray());
            call.resolve(r);
            return;
        }
        s.finishCapture();
        JSArray fr = new JSArray();
        for (String f : s.frameFiles()) fr.put(f);
        r.put("frames", fr);
        JSArray ts = new JSArray();
        for (Double t : s.frameTimes()) ts.put(t);
        r.put("times", ts);
        String snd = s.soundFile();
        if (snd != null) r.put("sound", snd);
        r.put("audioOk", snd != null);
        if (s.audioError() != null) r.put("audioError", s.audioError());
        r.put("width", s.frameWidth());
        r.put("height", s.frameHeight());
        r.put("fps", ScreenGrabService.fps);
        s.stopSelf();
        call.resolve(r);
    }
}
