package app.kguitar;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // our own plugin for receiving shared tabs, files and links (must be registered before super.onCreate)
        registerPlugin(ShareInPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
