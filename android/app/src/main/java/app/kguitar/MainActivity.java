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
        super.onCreate(savedInstanceState);
        if (getBridge() != null) getBridge().setWebViewClient(new MediaWebViewClient(getBridge()));
    }
}
