package app.kguitar;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * MIDI footswitches for hands-free control (the Android web view has no Web MIDI). USB MIDI devices are opened as
 * soon as they're plugged in; a Bluetooth LE MIDI pedal (like the M-Vave Chocolate Plus) is found with a short scan,
 * connected, and reconnected when it comes back. Every note / CC / program change goes to the web app as a "midi"
 * event with the device's name; the web app decides what each one does.
 */
@CapacitorPlugin(
    name = "Midi",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }, alias = "bleNew"),
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "bleOld")
    }
)
public class MidiPlugin extends Plugin {
    private static final UUID MIDI_SERVICE = UUID.fromString("03B80E5A-EDE8-4B33-A751-6CE34EC4C700");
    private final Handler main = new Handler(Looper.getMainLooper());
    private MidiManager mm;
    private boolean running = false;
    /** open devices by id: kept here so they aren't closed by the garbage collector */
    private final Map<Integer, MidiDevice> open = new HashMap<>();
    private final Map<Integer, List<MidiOutputPort>> ports = new HashMap<>();
    private final Map<Integer, String> names = new HashMap<>();
    private final Map<Integer, String> kinds = new HashMap<>();
    /** the Bluetooth pedal to keep connected */
    private String bleAddress = null;
    private boolean bleConnecting = false;
    private final Runnable bleRetry = this::reconnectBle;

    private final MidiManager.DeviceCallback callback = new MidiManager.DeviceCallback() {
        @Override public void onDeviceAdded(MidiDeviceInfo info) { openDevice(info); }
        @Override public void onDeviceRemoved(MidiDeviceInfo info) { closeDevice(info.getId()); sendDevices(); scheduleBle(4000); }
    };

    private MidiManager manager() {
        if (mm == null) mm = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
        return mm;
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", manager() != null);
        r.put("ble", getContext().getPackageManager().hasSystemFeature("android.hardware.bluetooth_le"));
        call.resolve(r);
    }

    /** Start listening: opens every MIDI device that's there now and any that's plugged in later. */
    @PluginMethod
    @SuppressWarnings("deprecation")
    public void start(PluginCall call) {
        MidiManager m = manager();
        if (m == null) { JSObject r = new JSObject(); r.put("error", "nomidi"); r.put("devices", new JSArray()); call.resolve(r); return; }
        if (!running) {
            running = true;
            m.registerDeviceCallback(callback, main);
            for (MidiDeviceInfo info : m.getDevices()) openDevice(info);
        }
        String addr = call.getString("ble");
        if (addr != null && !addr.isEmpty()) { bleAddress = addr; scheduleBle(300); }
        JSObject r = new JSObject();
        r.put("devices", deviceList());
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        running = false;
        main.removeCallbacks(bleRetry);
        bleAddress = null;
        MidiManager m = manager();
        if (m != null) { try { m.unregisterDeviceCallback(callback); } catch (Exception ignored) { } }
        for (Integer id : new ArrayList<>(open.keySet())) closeDevice(id);
        sendDevices();
        call.resolve();
    }

    @PluginMethod
    public void devices(PluginCall call) {
        JSObject r = new JSObject();
        r.put("devices", deviceList());
        call.resolve(r);
    }

    // ---------- Bluetooth LE MIDI ----------

    private boolean bleAllowed() {
        if (Build.VERSION.SDK_INT >= 31) return getPermissionState("bleNew") == PermissionState.GRANTED;
        return getPermissionState("bleOld") == PermissionState.GRANTED;
    }

    private void askBle(PluginCall call, String then) {
        requestPermissionForAlias(Build.VERSION.SDK_INT >= 31 ? "bleNew" : "bleOld", call, then);
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return bm == null ? null : bm.getAdapter();
    }

    /** Look for Bluetooth MIDI pedals for a few seconds; resolves with what it found. */
    @PluginMethod
    public void scanBle(PluginCall call) {
        if (!bleAllowed()) { askBle(call, "scanAllowed"); return; }
        doScan(call);
    }

    @PermissionCallback
    private void scanAllowed(PluginCall call) {
        if (bleAllowed()) doScan(call);
        else { JSObject r = new JSObject(); r.put("error", "permission"); r.put("found", new JSArray()); call.resolve(r); }
    }

    @SuppressWarnings("MissingPermission")
    private void doScan(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null) { fail(call, "nobluetooth"); return; }
        if (!a.isEnabled()) { fail(call, "off"); return; }
        BluetoothLeScanner sc = a.getBluetoothLeScanner();
        if (sc == null) { fail(call, "off"); return; }
        final Map<String, String> found = new LinkedHashMap<>();
        final ScanCallback cb = new ScanCallback() {
            @Override public void onScanResult(int type, ScanResult res) { take(res); }
            @Override public void onBatchScanResults(List<ScanResult> list) { for (ScanResult res : list) take(res); }
            @Override public void onScanFailed(int code) { }
            private void take(ScanResult res) {
                BluetoothDevice d = res.getDevice();
                if (d == null) return;
                String name = res.getScanRecord() != null ? res.getScanRecord().getDeviceName() : null;
                if (name == null) { try { name = d.getName(); } catch (SecurityException ignored) { } }
                boolean midi = false;
                if (res.getScanRecord() != null && res.getScanRecord().getServiceUuids() != null)
                    for (ParcelUuid u : res.getScanRecord().getServiceUuids()) if (MIDI_SERVICE.equals(u.getUuid())) midi = true;
                // some pedals only say they're MIDI in the scan response: go by the name too
                if (!midi && name != null && name.toLowerCase().matches(".*(chocolate|m-?vave|midi|footctrl|foot ?switch|pedal).*")) midi = true;
                if (midi) found.put(d.getAddress(), name == null ? "Bluetooth MIDI pedal" : name);
            }
        };
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        try { sc.startScan(null, settings, cb); } catch (SecurityException e) { fail(call, "permission"); return; }
        int ms = call.getInt("ms", 6000);
        main.postDelayed(() -> {
            try { sc.stopScan(cb); } catch (Exception ignored) { }
            JSArray arr = new JSArray();
            for (Map.Entry<String, String> e : found.entrySet()) {
                JSObject o = new JSObject();
                o.put("address", e.getKey());
                o.put("name", e.getValue());
                arr.put(o);
            }
            JSObject r = new JSObject();
            r.put("found", arr);
            call.resolve(r);
        }, ms);
    }

    private void fail(PluginCall call, String why) {
        JSObject r = new JSObject();
        r.put("error", why);
        r.put("found", new JSArray());
        call.resolve(r);
    }

    /** Connect to (and keep reconnecting) one Bluetooth MIDI pedal by its address. */
    @PluginMethod
    public void connectBle(PluginCall call) {
        String addr = call.getString("address");
        if (addr == null) { call.reject("address"); return; }
        if (!bleAllowed()) { askBle(call, "connectAllowed"); return; }
        bleAddress = addr;
        bleConnecting = false;
        reconnectBle();
        call.resolve();
    }

    @PermissionCallback
    private void connectAllowed(PluginCall call) {
        if (!bleAllowed()) { JSObject r = new JSObject(); r.put("error", "permission"); call.resolve(r); return; }
        bleAddress = call.getString("address");
        reconnectBle();
        call.resolve();
    }

    @PluginMethod
    public void forgetBle(PluginCall call) {
        bleAddress = null;
        main.removeCallbacks(bleRetry);
        for (Integer id : new ArrayList<>(open.keySet())) if ("ble".equals(kinds.get(id))) closeDevice(id);
        sendDevices();
        call.resolve();
    }

    private void scheduleBle(long ms) {
        if (bleAddress == null || !running) return;
        main.removeCallbacks(bleRetry);
        main.postDelayed(bleRetry, ms);
    }

    @SuppressWarnings("MissingPermission")
    private void reconnectBle() {
        if (bleAddress == null || bleConnecting || !running) return;
        if (bleOpen()) return;
        if (!bleAllowed()) return;
        BluetoothAdapter a = adapter();
        MidiManager m = manager();
        if (a == null || m == null || !a.isEnabled()) { scheduleBle(15000); return; }
        BluetoothDevice dev;
        try { dev = a.getRemoteDevice(bleAddress); } catch (IllegalArgumentException e) { return; }
        bleConnecting = true;
        status("connecting");
        try {
            m.openBluetoothDevice(dev, device -> {
                bleConnecting = false;
                if (device == null) { status("notfound"); scheduleBle(15000); return; }
                MidiDeviceInfo info = device.getInfo();
                listen(info, device);
                status("connected");
            }, main);
        } catch (SecurityException e) {
            bleConnecting = false;
        }
        // a connection that never answers: try again later
        main.postDelayed(() -> { if (bleConnecting) { bleConnecting = false; scheduleBle(10000); } }, 25000);
    }

    private boolean bleOpen() {
        for (Integer id : open.keySet()) if ("ble".equals(kinds.get(id))) return true;
        return false;
    }

    private void status(String s) {
        JSObject o = new JSObject();
        o.put("ble", s);
        notifyListeners("status", o);
    }

    // ---------- devices ----------

    private void openDevice(MidiDeviceInfo info) {
        if (!running || info.getOutputPortCount() == 0 || open.containsKey(info.getId())) return;
        // Bluetooth devices are opened through openBluetoothDevice (they show up here once connected)
        if (info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH) return;
        MidiManager m = manager();
        if (m == null) return;
        m.openDevice(info, device -> { if (device != null) listen(info, device); }, main);
    }

    private void listen(MidiDeviceInfo info, MidiDevice device) {
        int id = info.getId();
        if (open.containsKey(id)) { try { device.close(); } catch (Exception ignored) { } return; }
        Bundle p = info.getProperties();
        String name = p.getString(MidiDeviceInfo.PROPERTY_PRODUCT);
        if (name == null) name = p.getString(MidiDeviceInfo.PROPERTY_NAME);
        if (name == null) name = "MIDI device";
        String kind = info.getType() == MidiDeviceInfo.TYPE_USB ? "usb" : info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH ? "ble" : "other";
        open.put(id, device);
        names.put(id, name);
        kinds.put(id, kind);
        List<MidiOutputPort> list = new ArrayList<>();
        for (int i = 0; i < info.getOutputPortCount(); i++) {
            MidiOutputPort port = device.openOutputPort(i);
            if (port == null) continue;
            port.connect(new Parser(name));
            list.add(port);
        }
        ports.put(id, list);
        sendDevices();
    }

    private void closeDevice(int id) {
        List<MidiOutputPort> list = ports.remove(id);
        if (list != null) for (MidiOutputPort port : list) { try { port.close(); } catch (Exception ignored) { } }
        MidiDevice d = open.remove(id);
        if (d != null) { try { d.close(); } catch (Exception ignored) { } }
        names.remove(id);
        kinds.remove(id);
    }

    private JSArray deviceList() {
        JSArray arr = new JSArray();
        for (Integer id : open.keySet()) {
            JSObject o = new JSObject();
            o.put("id", id);
            o.put("name", names.get(id));
            o.put("kind", kinds.get(id));
            arr.put(o);
        }
        return arr;
    }

    private void sendDevices() {
        JSObject o = new JSObject();
        o.put("devices", deviceList());
        notifyListeners("devices", o);
    }

    @Override
    protected void handleOnDestroy() {
        main.removeCallbacks(bleRetry);
        for (Integer id : new ArrayList<>(open.keySet())) closeDevice(id);
    }

    /** Turns the byte stream into whole messages (running status, skipping clock and SysEx) and sends each one. */
    private class Parser extends MidiReceiver {
        private final String device;
        private int status = 0, need = 0, n = 0, d0 = 0;
        private boolean sysex = false;

        Parser(String device) { this.device = device; }

        @Override
        public void onSend(byte[] msg, int offset, int count, long timestamp) {
            for (int i = offset; i < offset + count; i++) {
                int b = msg[i] & 0xff;
                if (b >= 0xF8) continue; // clock, start/stop, active sensing
                if (b >= 0xF0) { sysex = b == 0xF0; status = 0; continue; }
                if (sysex) continue;
                if ((b & 0x80) != 0) {
                    status = b;
                    n = 0;
                    int t = b & 0xF0;
                    need = t == 0xC0 || t == 0xD0 ? 1 : 2;
                    continue;
                }
                if (status == 0) continue;
                if (n == 0) d0 = b;
                n++;
                if (n == need) {
                    emit(status, d0, need == 2 ? b : 0);
                    n = 0; // running status: the next data bytes reuse it
                }
            }
        }

        private void emit(int st, int a, int b) {
            JSObject o = new JSObject();
            JSArray data = new JSArray();
            data.put(st);
            data.put(a);
            data.put(b);
            o.put("data", data);
            o.put("device", device);
            notifyListeners("midi", o);
        }
    }
}
