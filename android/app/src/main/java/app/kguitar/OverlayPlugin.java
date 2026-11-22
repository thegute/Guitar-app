package app.kguitar;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor plugin to control KGuitar's system-wide floating overlay bubble (over Songsterr, YouTube, Spotify, etc.).
 */
@CapacitorPlugin(
    name = "KGOverlay",
    permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class OverlayPlugin extends Plugin {

    private static volatile String pendingRoute = null;

    static void setPendingRoute(String route) {
        pendingRoute = route;
    }

    @PluginMethod
    public void canDrawOverlays(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(getContext());
        JSObject r = new JSObject();
        r.put("granted", ok);
        r.put("running", OverlayService.isRunning());
        call.resolve(r);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(getContext())) {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        JSObject r = new JSObject();
        r.put("granted", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void startOverlay(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(getContext())) {
            JSObject r = new JSObject();
            r.put("ok", false);
            r.put("needsPermission", true);
            call.resolve(r);
            return;
        }
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            requestPermissionForAlias("audio", call, "afterAudioPerm");
            return;
        }
        launchOverlay(call);
    }

    @PermissionCallback
    private void afterAudioPerm(PluginCall call) {
        // Start overlay even if user declines mic (manual chord/fretboard/licks still work!)
        launchOverlay(call);
    }

    private void launchOverlay(PluginCall call) {
        boolean expanded = call.getBoolean("expanded", true);
        Intent svc = new Intent(getContext(), OverlayService.class);
        svc.setAction(OverlayService.ACTION_START);
        svc.putExtra(OverlayService.EXTRA_START_EXPANDED, expanded);
        ContextCompat.startForegroundService(getContext(), svc);
        JSObject r = new JSObject();
        r.put("ok", true);
        r.put("running", true);
        call.resolve(r);
    }

    @PluginMethod
    public void stopOverlay(PluginCall call) {
        Intent svc = new Intent(getContext(), OverlayService.class);
        svc.setAction(OverlayService.ACTION_STOP);
        getContext().stopService(svc);
        JSObject r = new JSObject();
        r.put("ok", true);
        r.put("running", false);
        call.resolve(r);
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", OverlayService.isRunning());
        call.resolve(r);
    }

    @PluginMethod
    public void updateChord(PluginCall call) {
        OverlayService.updateChordText(call.getString("text", ""));
        call.resolve();
    }

    @PluginMethod
    public void consumeRoute(PluginCall call) {
        String route = pendingRoute;
        pendingRoute = null;
        JSObject r = new JSObject();
        r.put("route", route != null ? route : "");
        call.resolve(r);
    }
}
