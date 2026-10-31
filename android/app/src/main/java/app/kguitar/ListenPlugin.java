package app.kguitar;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.Locale;

/** Hands-free helper: listen for one spoken phrase with the phone's own speech recognition, and return the words. */
@CapacitorPlugin(name = "Listen", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic") })
public class ListenPlugin extends Plugin {
    private SpeechRecognizer sr;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) { requestPermissionForAlias("mic", call, "micDone"); return; }
        start(call);
    }

    @PermissionCallback
    private void micDone(PluginCall call) {
        if (getPermissionState("mic") == PermissionState.GRANTED) start(call);
        else { JSObject r = new JSObject(); r.put("text", ""); r.put("error", "permission"); call.resolve(r); }
    }

    private void finish(PluginCall call, String text, String error) {
        JSObject r = new JSObject();
        r.put("text", text == null ? "" : text);
        if (error != null) r.put("error", error);
        call.resolve(r);
        getActivity().runOnUiThread(() -> { if (sr != null) { sr.destroy(); sr = null; } });
    }

    private void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (sr != null) { sr.destroy(); sr = null; }
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { finish(call, "", "unavailable"); return; }
            sr = SpeechRecognizer.createSpeechRecognizer(getContext());
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", Locale.getDefault().toLanguageTag()));
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1400L);
            sr.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle b) { notifyListeners("ready", new JSObject()); }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float v) { JSObject o = new JSObject(); o.put("level", v); notifyListeners("level", o); }
                @Override public void onBufferReceived(byte[] b) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onError(int e) {
                    String why = e == SpeechRecognizer.ERROR_NO_MATCH || e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "nothing"
                        : e == SpeechRecognizer.ERROR_NETWORK || e == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ? "network"
                        : e == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "permission"
                        : e == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? "busy" : "error";
                    finish(call, "", why);
                }
                @Override public void onResults(Bundle b) {
                    ArrayList<String> m = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    finish(call, m != null && !m.isEmpty() ? m.get(0) : "", null);
                }
                @Override public void onPartialResults(Bundle b) {
                    ArrayList<String> m = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (m != null && !m.isEmpty()) { JSObject o = new JSObject(); o.put("text", m.get(0)); notifyListeners("partial", o); }
                }
                @Override public void onEvent(int t, Bundle b) {}
            });
            sr.startListening(i);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (sr != null) { sr.cancel(); sr.destroy(); sr = null; } });
        call.resolve();
    }
}
