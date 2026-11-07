package app.kguitar;

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
        super.onCreate(savedInstanceState);
        if (getBridge() != null) getBridge().setWebViewClient(new MediaWebViewClient(getBridge()));
    }
}
