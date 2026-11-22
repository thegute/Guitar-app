package app.kguitar;

import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import androidx.core.content.ContextCompat;

/**
 * Android Quick Settings Tile ("KGuitar Bubble"): lets you swipe down from the top of the screen
 * while inside Songsterr, YouTube or Spotify and toggle the floating KGuitar HUD in 1 tap!
 */
public class OverlayTileService extends TileService {

    public static void refreshTile(Context ctx) {
        try {
            requestListeningState(ctx, new ComponentName(ctx, OverlayTileService.class));
        } catch (Exception ignored) {
            // tile not pinned yet
        }
    }

    @Override
    public void onStartListening() {
        super.onStartListening();
        syncTile();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onClick() {
        super.onClick();
        if (OverlayService.isRunning()) {
            stopService(new Intent(this, OverlayService.class));
            syncTile(false);
            return;
        }
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            Intent perm = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
            perm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (Build.VERSION.SDK_INT >= 34) {
                PendingIntent pi = PendingIntent.getActivity(this, 19, perm, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                startActivityAndCollapse(pi);
            } else {
                startActivityAndCollapse(perm);
            }
            return;
        }
        Intent svc = new Intent(this, OverlayService.class);
        svc.setAction(OverlayService.ACTION_START);
        svc.putExtra(OverlayService.EXTRA_START_EXPANDED, true);
        ContextCompat.startForegroundService(this, svc);
        syncTile(true);
    }

    private void syncTile() {
        syncTile(OverlayService.isRunning());
    }

    private void syncTile(boolean active) {
        Tile t = getQsTile();
        if (t == null) return;
        t.setState(active ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        t.setLabel("KGuitar Bubble");
        t.updateTile();
    }
}
