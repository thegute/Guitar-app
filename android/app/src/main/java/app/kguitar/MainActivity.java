package app.kguitar;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // our own plugin for receiving shared tabs, files and links (must be registered before super.onCreate)
        registerPlugin(ShareInPlugin.class);
        // your video lessons: read a folder you pick, play its videos with seeking
        registerPlugin(LessonFoldersPlugin.class);
        registerPlugin(SpeakPlugin.class);
        registerPlugin(ImmersivePlugin.class);
        registerPlugin(ListenPlugin.class);
        // MIDI footswitches: USB and Bluetooth LE MIDI (the web view has no Web MIDI)
        registerPlugin(MidiPlugin.class);
        // Riff Scanner: grab the screen + the sound inside the phone while a video plays
        registerPlugin(ScreenGrabPlugin.class);
        // Riff Scanner: the guitar-note and beat models on the phone
        registerPlugin(MlPlugin.class);
        // Floating Bubble HUD over Songsterr, YouTube, Spotify & other apps
        registerPlugin(OverlayPlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null) getBridge().setWebViewClient(new MediaWebViewClient(getBridge()));
        captureOverlayRoute(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        captureOverlayRoute(intent);
    }

    private void captureOverlayRoute(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra("kg_route");
        if (route != null && !route.isEmpty()) {
            OverlayPlugin.setPendingRoute(route);
            intent.removeExtra("kg_route");
        }
    }
}
