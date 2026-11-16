package app.kguitar;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
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
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Locale;

/** Hands-free helper: listen for one spoken phrase with the phone's own speech recognition, and return the words. */
@CapacitorPlugin(name = "Listen", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic") })
public class ListenPlugin extends Plugin {
    private SpeechRecognizer sr;
    private PluginCall pending;
    // When a USB pedal / interface is plugged in, Android's speech recognition listens to IT (no mic on a guitar rig).
    // Then we record the phone's own built-in mic ourselves and hand that sound to the recognizer (Android 13+).
    private AudioRecord rec;
    private Thread pump;
    private volatile boolean pumping;
    private ParcelFileDescriptor[] pipe;
    private static final int RATE = 16000;

    /** The phone's own microphone, when some other input (USB pedal, interface, USB headset) is plugged in. */
    private AudioDeviceInfo builtInMicIfOtherInput() {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return null;
        AudioDeviceInfo mic = null;
        boolean other = false;
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
            int t = d.getType();
            if (t == AudioDeviceInfo.TYPE_BUILTIN_MIC) { if (mic == null) mic = d; }
            else if (t == AudioDeviceInfo.TYPE_USB_DEVICE || t == AudioDeviceInfo.TYPE_USB_HEADSET || t == AudioDeviceInfo.TYPE_USB_ACCESSORY
                || t == AudioDeviceInfo.TYPE_LINE_ANALOG || t == AudioDeviceInfo.TYPE_LINE_DIGITAL) other = true;
        }
        return other ? mic : null;
    }

    /** Start recording the built-in mic into a pipe the recognizer reads; null if it can't (then the default input is used). */
    private ParcelFileDescriptor startOwnMic() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return null;
        AudioDeviceInfo mic = builtInMicIfOtherInput();
        if (mic == null) return null;
        try {
            int min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            rec = new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, Math.max(min, RATE));
            if (rec.getState() != AudioRecord.STATE_INITIALIZED) { stopOwnMic(); return null; }
            rec.setPreferredDevice(mic);
            pipe = ParcelFileDescriptor.createPipe();
            final FileOutputStream out = new FileOutputStream(pipe[1].getFileDescriptor());
            rec.startRecording();
            pumping = true;
            final AudioRecord r = rec;
            pump = new Thread(() -> {
                byte[] buf = new byte[1024];
                try {
                    while (pumping) {
                        int n = r.read(buf, 0, buf.length);
                        if (n > 0) out.write(buf, 0, n);
                    }
                } catch (IOException ignored) { /* the recognizer closed its end */ }
                try { out.close(); } catch (IOException ignored) { }
            }, "kg-listen-mic");
            pump.start();
            return pipe[0];
        } catch (Exception e) {
            stopOwnMic();
            return null;
        }
    }

    private void stopOwnMic() {
        pumping = false;
        if (rec != null) { try { rec.stop(); } catch (Exception ignored) { } rec.release(); rec = null; }
        if (pipe != null) { for (ParcelFileDescriptor p : pipe) { try { p.close(); } catch (IOException ignored) { } } pipe = null; }
        pump = null;
    }

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
        if (pending != call) return; // already answered (stopped, or a second callback)
        pending = null;
        JSObject r = new JSObject();
        r.put("text", text == null ? "" : text);
        if (error != null) r.put("error", error);
        call.resolve(r);
        getActivity().runOnUiThread(() -> { if (sr != null) { sr.destroy(); sr = null; } stopOwnMic(); });
    }

    private void start(PluginCall call) { start(call, true); }

    private void start(PluginCall call, boolean ownMic) {
        if (pending != null && pending != call) finish(pending, "", "stopped");
        pending = call;
        getActivity().runOnUiThread(() -> {
            if (sr != null) { sr.destroy(); sr = null; }
            stopOwnMic();
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { finish(call, "", "unavailable"); return; }
            sr = SpeechRecognizer.createSpeechRecognizer(getContext());
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", Locale.getDefault().toLanguageTag()));
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1400L);
            final ParcelFileDescriptor src = ownMic ? startOwnMic() : null;
            if (src != null) {
                i.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, src);
                i.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT, 1);
                i.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING, AudioFormat.ENCODING_PCM_16BIT);
                i.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE, RATE);
            }
            sr.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle b) { notifyListeners("ready", new JSObject()); }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float v) { JSObject o = new JSObject(); o.put("level", v); notifyListeners("level", o); }
                @Override public void onBufferReceived(byte[] b) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onError(int e) {
                    // the recognizer couldn't take our mic sound: try once more the normal way
                    if (src != null && pending == call && (e == SpeechRecognizer.ERROR_CLIENT || e == SpeechRecognizer.ERROR_AUDIO)) {
                        start(call, false);
                        return;
                    }
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
        if (pending != null) finish(pending, "", "stopped");
        getActivity().runOnUiThread(() -> { if (sr != null) { sr.cancel(); sr.destroy(); sr = null; } stopOwnMic(); });
        call.resolve();
    }
}
