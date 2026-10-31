package app.kguitar;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Full screen the friendly way: the phone's buttons, status bar and taskbar tuck away, and a swipe up from the bottom
 * (or down from the top) brings them back for a few seconds before they tuck away again.
 */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {
    private boolean on = false;

    @PluginMethod
    public void set(PluginCall call) {
        on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> { apply(); call.resolve(); });
    }

    private void apply() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getActivity().getWindow(), getActivity().getWindow().getDecorView());
        if (on) {
            c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            c.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            c.show(WindowInsetsCompat.Type.systemBars());
        }
    }

    // coming back to the app (or unfolding the phone) re-applies it
    @Override
    protected void handleOnResume() {
        if (on) getActivity().runOnUiThread(this::apply);
    }
}
