package net.doinu.kid;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;
import java.util.Queue;

/**
 * Offline Doinu shell, MIDI edition.
 *
 * The built PWA lives in {@code assets/www} and is served through
 * {@link WebViewAssetLoader} at {@code https://appassets.androidplatform.net}
 * (a secure context — required by getUserMedia and by the Web MIDI shim).
 *
 * MIDI path: the shell opens every class-compliant USB MIDI device through
 * {@link MidiManager} (no USB permission flow, no Chrome needed — Android's MIDI
 * service owns the device), parses note on/off, batches them, and hands them to
 * the page as `window.__doinuMidiBatch([{status,note,velocity}])`. The page's
 * injected Web MIDI shim turns those into `MIDIMessageEvent`s on the input that
 * `navigator.requestMIDIAccess()` returns, so the shipped Doinu code works
 * untouched.
 *
 * The microphone path is left intact as an in-app fallback (the "Use mic"
 * toggle), so the app still works without the cable.
 */
public class MainActivity extends Activity {

    private static final String DOMAIN = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + DOMAIN + "/assets/www/index.html";
    private static final int REQUEST_MIC = 1001;
    private static final long FLUSH_MS = 8;

    private WebView webView;
    private PermissionRequest pendingAudio;

    // ---- MIDI bridge ----
    private MidiManager midiManager;
    private MidiManager.DeviceCallback midiCallback;
    private final Map<MidiDeviceInfo, MidiDevice> midiDevices = new HashMap<>();
    private final Queue<JSONObject> midiQueue = new ArrayDeque<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean demoMode;

    // Re-runs as long as the activity is resumed; a no-op when the queue dries up
    // (the timers die with onDestroy).
    private final Runnable midiFlush = new Runnable() {
        @Override
        public void run() {
            flushMidi();
            mainHandler.postDelayed(this, FLUSH_MS);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        Intent intent = getIntent();
        demoMode = intent != null && intent.getBooleanExtra("demoMidi", false);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF5EC8FF);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                android.util.Log.i("DoinuBridge", "page finished: " + url);
                // Re-sync the device list once the page (and the shim) are ready.
                scanMidiDevices();
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);

        webView.setWebChromeClient(new WebChromeClient() {
            // Surface page console.log into logcat (tag DoinuBridge) — used to
            // verify the shim bridge end to end on a device.
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                android.util.Log.i("DoinuBridge", message.message());
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (wantsAudio(request) && !hasMicPermission()) {
                            pendingAudio = request;
                            askForMic();
                        } else {
                            request.grant(request.getResources());
                        }
                    }
                });
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingAudio == request) {
                    pendingAudio = null;
                }
            }
        });

        setContentView(webView);
        hideSystemBars();
        startMidiService();
        webView.loadUrl(START_URL);
    }

    // ------------------------------------------------------------------ MIDI --

    private void startMidiService() {
        midiManager = (MidiManager) getSystemService(MIDI_SERVICE);
        android.util.Log.i("DoinuBridge", "startMidiService: manager=" + (midiManager != null));
        // The demo mode feeds the page directly (queue -> evaluateJavascript), so it
        // runs even where the platform has no MIDI service (e.g. some emulators).
        if (demoMode) {
            mainHandler.postDelayed(midiDemo, 1500);
        }
        mainHandler.post(midiFlush);
        if (midiManager == null) {
            return;
        }
        midiCallback = new MidiManager.DeviceCallback() {
            @Override
            public void onDeviceAdded(MidiDeviceInfo info) {
                openMidiDevice(info);
            }

            @Override
            public void onDeviceRemoved(MidiDeviceInfo info) {
                MidiDevice device = midiDevices.remove(info);
                if (device != null) {
                    try {
                        device.close();
                    } catch (Exception ignored) {
                    }
                }
                pushDeviceStatus(false, null);
            }
        };
        midiManager.registerDeviceCallback(midiCallback, mainHandler);
        scanMidiDevices();
    }

    private void scanMidiDevices() {
        if (midiManager == null) {
            return;
        }
        for (MidiDeviceInfo info : midiManager.getDevices()) {
            openMidiDevice(info);
        }
        boolean connected = !midiDevices.isEmpty();
        pushDeviceStatus(connected, null);
        if (demoMode) {
            // The demo exercises the page even though no real device is attached.
            pushDeviceStatus(false, null);
        }
    }

    private void openMidiDevice(final MidiDeviceInfo info) {
        if (midiDevices.containsKey(info)) {
            return;
        }
        final int ports = info.getOutputPortCount();
        if (ports == 0) {
            return;
        }
        midiManager.openDevice(info, new MidiManager.OnDeviceOpenedListener() {
            @Override
            public void onDeviceOpened(MidiDevice device) {
                if (device == null) {
                    return;
                }
                midiDevices.put(info, device);
                for (int i = 0; i < ports; i++) {
                    final MidiOutputPort port = device.openOutputPort(i);
                    if (port != null) {
                        port.connect(new MidiReceiver() {
                            @Override
                            public void onSend(byte[] data, int offset, int count, long timestamp) {
                                onMidiReceived(data);
                            }
                        });
                    }
                }
                pushDeviceStatus(true, deviceName(info));
            }
        }, mainHandler);
    }

    private static String deviceName(MidiDeviceInfo info) {
        try {
            String name = info.getProperties().getString(MidiDeviceInfo.PROPERTY_NAME);
            if (name != null && !name.trim().isEmpty()) {
                return name;
            }
        } catch (Exception ignored) {
        }
        return "MIDI Keyboard";
    }

    private void onMidiReceived(byte[] data) {
        if (data == null || data.length < 3) {
            return;
        }
        int status = data[0] & 0xFF;
        int note = data[1] & 0x7F;
        int velocity = data[2] & 0x7F;
        int kind = status & 0xF0;
        if (kind != 0x90 && kind != 0x80) {
            return; // only note events (P-225 sends them on channel 1)
        }
        if (kind == 0x90 && velocity == 0) {
            status = 0x80; // note-on with velocity 0 == note-off
        }
        enqueueMidi(status, note, velocity);
    }

    private void enqueueMidi(int status, int note, int velocity) {
        android.util.Log.i("DoinuBridge", "midi in: " + status + " " + note + " " + velocity);
        JSONObject ev = new JSONObject();
        try {
            ev.put("status", status);
            ev.put("note", note);
            ev.put("velocity", velocity);
        } catch (Exception ignored) {
            return;
        }
        midiQueue.add(ev);
    }

    private void flushMidi() {
        if (midiQueue.isEmpty() || webView == null) {
            return;
        }
        android.util.Log.i("DoinuBridge", "flushing " + midiQueue.size() + " to page");
        JSONArray arr = new JSONArray();
        JSONObject ev;
        while ((ev = midiQueue.poll()) != null) {
            arr.put(ev);
        }
        webView.evaluateJavascript("window.__doinuMidiBatch(" + arr + ")", null);
    }

    private void pushDeviceStatus(boolean connected, String name) {
        android.util.Log.i("DoinuBridge", "device status: " + connected + " name=" + name);
        if (webView == null) {
            return;
        }
        String jsName = name == null ? "null" : JSONObject.quote(name);
        webView.evaluateJavascript(
                "window.__doinuMidiDevice(" + connected + ", " + jsName + ")", null);
    }

    // A synthetic note run used to exercise the app inside an emulator, where no
    // USB MIDI device exists. Enabled with `am start ... --ez demoMidi true`.
    private final Runnable midiDemo = new Runnable() {
        private int step;
        private final int[] notes = {
                60, 62, 64, 67, 72, 72, 67, 64, 62, 60,      // C D E G C' (descending)
                67, 69, 72, 76, 79, 79,                      // G A C' E' G'
        };

        @Override
        public void run() {
            if (!demoMode || webView == null) {
                return;
            }
            int n = notes[step % notes.length];
            step++;
            enqueueMidi(0x90, n, 96);
            mainHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    enqueueMidi(0x80, n, 0);
                }
            }, 350);
            mainHandler.postDelayed(this, 900);
        }
    };

    // ------------------------------------------------------------ permissions --

    private static boolean wantsAudio(PermissionRequest request) {
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasMicPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void askForMic() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !hasMicPermission()) {
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQUEST_MIC);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_MIC) {
            return;
        }
        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (pendingAudio != null) {
            if (granted) {
                pendingAudio.grant(pendingAudio.getResources());
            } else {
                pendingAudio.deny();
            }
            pendingAudio = null;
        }
        if (!granted) {
            Toast.makeText(this, R.string.mic_needed, Toast.LENGTH_LONG).show();
        }
    }

    // ------------------------------------------------------------------- UI --

    private void hideSystemBars() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacks(midiFlush);
        mainHandler.removeCallbacks(midiDemo);
        if (midiManager != null && midiCallback != null) {
            try {
                midiManager.unregisterDeviceCallback(midiCallback);
            } catch (Exception ignored) {
            }
        }
        for (MidiDevice device : midiDevices.values()) {
            try {
                device.close();
            } catch (Exception ignored) {
            }
        }
        midiDevices.clear();
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
