package app.kguitar;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The Riff Scanner's screen grab: asks Android for permission to capture the screen (Android shows its own dialog
 * every time), then ScreenGrabService saves frames and the sound playing inside the phone until stop() or time's up.
 * stop() returns the frame pictures and the sound file (in the app's cache; the next grab clears them).
 */
@CapacitorPlugin(name = "ScreenGrab")
public class ScreenGrabPlugin extends Plugin {
    private PluginCall starting;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", Build.VERSION.SDK_INT >= 21);
        r.put("sound", Build.VERSION.SDK_INT >= 29);
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        MediaProjectionManager mpm = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm == null) { JSObject r = new JSObject(); r.put("ok", false); r.put("error", "unavailable"); call.resolve(r); return; }
        ScreenGrabService.fps = Math.max(1, Math.min(4, call.getInt("fps", 2)));
        ScreenGrabService.maxSeconds = Math.max(5, Math.min(600, call.getInt("seconds", 120)));
        ScreenGrabService.wantAudio = call.getBoolean("sound", true);
        startActivityForResult(call, mpm.createScreenCaptureIntent(), "consent");
    }

    @ActivityCallback
    private void consent(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject r = new JSObject(); r.put("ok", false); r.put("error", "refused"); call.resolve(r); return;
        }
        ScreenGrabService.resultCode = result.getResultCode();
        ScreenGrabService.resultData = result.getData();
        ScreenGrabService.onStoppedByItself = () -> notifyListeners("stopped", new JSObject());
        ScreenGrabService.onStarted = s -> {
            JSObject r = new JSObject();
            r.put("ok", "ok".equals(s));
            if (!"ok".equals(s)) r.put("error", s);
            call.resolve(r);
        };
        Intent svc = new Intent(getContext(), ScreenGrabService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(svc);
            else getContext().startService(svc);
        } catch (Exception e) {
            ScreenGrabService.onStarted = null;
            JSObject r = new JSObject(); r.put("ok", false); r.put("error", "error: " + e.getMessage()); call.resolve(r);
        }
    }

    /** Stop and hand back what was grabbed. */
    @PluginMethod
    public void stop(PluginCall call) {
        ScreenGrabService s = ScreenGrabService.instance;
        JSObject r = new JSObject();
        if (s == null) { r.put("frames", new JSArray()); call.resolve(r); return; }
        s.finishCapture();
        JSArray fr = new JSArray();
        for (String f : s.frameFiles()) fr.put(f);
        r.put("frames", fr);
        String snd = s.soundFile();
        if (snd != null) r.put("sound", snd);
        r.put("width", s.frameWidth());
        r.put("height", s.frameHeight());
        r.put("fps", ScreenGrabService.fps);
        s.stopSelf();
        call.resolve(r);
    }
}
