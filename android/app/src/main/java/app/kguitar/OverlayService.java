package app.kguitar;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Floating KGuitar HUD overlay over ANY Android app (Songsterr, YouTube, Spotify, etc.).
 * Runs as a lightweight foreground service with:
 * - Collapsed Edge Pill (draggable, snaps to left/right edge, displays live detected chord)
 * - Expanded HUD Window (draggable header, corner resize handle, opacity, Ghost click-through mode,
 *   hosting a WebView serving https://localhost/?overlay=1 straight from assets/public/ so it shares
 *   localStorage with KGuitar and keeps working even while Songsterr is in the foreground).
 */
public class OverlayService extends Service {

    public static final String ACTION_START = "app.kguitar.OVERLAY_START";
    public static final String ACTION_STOP = "app.kguitar.OVERLAY_STOP";
    public static final String ACTION_EXPAND = "app.kguitar.OVERLAY_EXPAND";
    public static final String ACTION_COLLAPSE = "app.kguitar.OVERLAY_COLLAPSE";
    public static final String EXTRA_START_EXPANDED = "expanded";

    private static final String CHANNEL_ID = "kguitar-overlay";
    private static final int NOTIF_ID = 14;

    private static volatile OverlayService instance;

    public static boolean isRunning() {
        return instance != null;
    }

    public static void updateChordText(String text) {
        OverlayService svc = instance;
        if (svc != null) svc.setChordLabel(text);
    }

    private WindowManager wm;
    private Handler mainHandler;
    private float density = 1f;
    private int screenW = 1080;
    private int screenH = 1920;

    // Expanded HUD window
    private LinearLayout hudRoot;
    private WindowManager.LayoutParams hudParams;
    private TextView hudChordLabel;
    private TextView hudGhostBtn;
    private WebView webView;

    // Collapsed Edge Bubble Pill
    private LinearLayout bubbleRoot;
    private WindowManager.LayoutParams bubbleParams;
    private TextView bubbleChordLabel;

    // Tiny edge unlock pill shown only during Ghost (click-through) mode
    private TextView ghostUnlockPill;
    private WindowManager.LayoutParams ghostUnlockParams;

    private boolean expanded = true;
    private boolean ghostMode = false;
    private float hudAlpha = 0.96f;
    private String currentChord = "";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        mainHandler = new Handler(Looper.getMainLooper());
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        density = dm.density;
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        startOverlayForeground();

        if (hudRoot == null) {
            boolean startExp = intent == null || intent.getBooleanExtra(EXTRA_START_EXPANDED, true);
            buildViews();
            setExpanded(startExp);
        } else if (ACTION_EXPAND.equals(action)) {
            setGhostMode(false);
            setExpanded(true);
        } else if (ACTION_COLLAPSE.equals(action)) {
            setGhostMode(false);
            setExpanded(false);
        }
        OverlayTileService.refreshTile(this);
        return START_STICKY;
    }

    private void startOverlayForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "KGuitar Floating Bubble", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Keeps the KGuitar fretboard & live chord bubble floating over other apps");
            nm.createNotificationChannel(ch);
        }
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent expandPi = PendingIntent.getService(this, 1, new Intent(this, OverlayService.class).setAction(ACTION_EXPAND), piFlags);
        PendingIntent stopPi = PendingIntent.getService(this, 2, new Intent(this, OverlayService.class).setAction(ACTION_STOP), piFlags);

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_kguitar)
            .setContentTitle("KGuitar Bubble is floating")
            .setContentText("Tap to expand over your app, or Close to turn off")
            .setOngoing(true)
            .setContentIntent(expandPi)
            .addAction(0, "Expand", expandPi)
            .addAction(0, "Close", stopPi)
            .build();

        if (Build.VERSION.SDK_INT >= 34) {
            boolean hasMic = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            int fgsType = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
            if (hasMic) fgsType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            startForeground(NOTIF_ID, notif, fgsType);
        } else if (Build.VERSION.SDK_INT >= 29) {
            boolean hasMic = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            if (hasMic) {
                startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(NOTIF_ID, notif);
            }
        } else {
            startForeground(NOTIF_ID, notif);
        }
    }

    private int dp(int v) {
        return Math.round(v * density);
    }

    private int overlayType() {
        return Build.VERSION.SDK_INT >= 26
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
    }

    @SuppressLint({ "SetJavaScriptEnabled", "ClickableViewAccessibility" })
    private void buildViews() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;

        // 1. Collapsed Edge Pill
        bubbleRoot = new LinearLayout(this);
        bubbleRoot.setOrientation(LinearLayout.HORIZONTAL);
        bubbleRoot.setGravity(Gravity.CENTER_VERTICAL);
        bubbleRoot.setPadding(dp(12), dp(8), dp(12), dp(8));
        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setColor(Color.parseColor("#EE1D0B38"));
        pillBg.setCornerRadius(dp(24));
        pillBg.setStroke(dp(2), Color.parseColor("#B66BFF"));
        bubbleRoot.setBackground(pillBg);
        bubbleRoot.setElevation(dp(8));

        bubbleChordLabel = new TextView(this);
        bubbleChordLabel.setText("KG");
        bubbleChordLabel.setTextColor(Color.WHITE);
        bubbleChordLabel.setTextSize(14f);
        bubbleChordLabel.setTypeface(Typeface.DEFAULT_BOLD);
        bubbleRoot.addView(bubbleChordLabel);

        bubbleParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = screenW - dp(84);
        bubbleParams.y = Math.round(screenH * 0.24f);

        bubbleRoot.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startX, startY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startX = bubbleParams.x;
                        startY = bubbleParams.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX;
                        float dy = e.getRawY() - downY;
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true;
                        bubbleParams.x = Math.max(0, Math.min(screenW - v.getWidth(), Math.round(startX + dx)));
                        bubbleParams.y = Math.max(dp(24), Math.min(screenH - dp(72), Math.round(startY + dy)));
                        safeUpdate(bubbleRoot, bubbleParams);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) {
                            setExpanded(true);
                        } else {
                            // Snap smoothly to nearest left or right screen edge
                            int mid = bubbleParams.x + v.getWidth() / 2;
                            bubbleParams.x = mid < screenW / 2 ? dp(6) : Math.max(dp(6), screenW - v.getWidth() - dp(6));
                            safeUpdate(bubbleRoot, bubbleParams);
                        }
                        return true;
                }
                return false;
            }
        });

        // 2. Expanded HUD Window
        hudRoot = new LinearLayout(this);
        hudRoot.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable hudBg = new GradientDrawable();
        hudBg.setColor(Color.parseColor("#F2120824"));
        hudBg.setCornerRadius(dp(16));
        hudBg.setStroke(dp(1), Color.parseColor("#9B5CFF"));
        hudRoot.setBackground(hudBg);
        hudRoot.setElevation(dp(12));
        hudRoot.setClipToOutline(true);

        // Slim native top drag bar (keeps maximum vertical room for Fretboard & Circle)
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dp(8), dp(2), dp(5), dp(2));
        topBar.setBackgroundColor(Color.parseColor("#E6220D42"));

        TextView grip = new TextView(this);
        grip.setText("⠿ KG");
        grip.setTextColor(Color.parseColor("#E6D4FF"));
        grip.setTextSize(11.5f);
        grip.setTypeface(Typeface.DEFAULT_BOLD);
        topBar.addView(grip);

        hudChordLabel = new TextView(this);
        hudChordLabel.setText("");
        hudChordLabel.setTextColor(Color.parseColor("#FFD35C"));
        hudChordLabel.setTextSize(11.5f);
        hudChordLabel.setTypeface(Typeface.DEFAULT_BOLD);
        hudChordLabel.setSingleLine(true);
        hudChordLabel.setPadding(dp(6), 0, dp(4), 0);
        LinearLayout.LayoutParams chordLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        topBar.addView(hudChordLabel, chordLp);

        hudGhostBtn = makeBarBtn("Ghost", "Click-through mode");
        hudGhostBtn.setOnClickListener(v -> setGhostMode(!ghostMode));
        topBar.addView(hudGhostBtn);

        TextView minBtn = makeBarBtn("–", "Shrink to bubble");
        minBtn.setOnClickListener(v -> setExpanded(false));
        topBar.addView(minBtn);

        TextView closeBtn = makeBarBtn("×", "Close overlay");
        closeBtn.setOnClickListener(v -> stopSelf());
        topBar.addView(closeBtn);

        hudRoot.addView(topBar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // Body container with WebView + bottom-right resize grip
        FrameLayout bodyWrap = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setDatabaseEnabled(true);
        webView.setWebViewClient(new OverlayAssetClient(this));
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Grant mic capture inside the trusted local KGuitar overlay when Android RECORD_AUDIO is granted
                if (ContextCompat.checkSelfPermission(OverlayService.this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    request.deny();
                }
            }
        });
        webView.addJavascriptInterface(new OverlayJsBridge(), "KGOverlayBridge");
        bodyWrap.addView(webView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView resizeHandle = new TextView(this);
        resizeHandle.setText("◢");
        resizeHandle.setTextColor(Color.parseColor("#CCB68CFF"));
        resizeHandle.setTextSize(14f);
        resizeHandle.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams rhLp = new FrameLayout.LayoutParams(dp(28), dp(28), Gravity.BOTTOM | Gravity.END);
        bodyWrap.addView(resizeHandle, rhLp);

        hudRoot.addView(bodyWrap, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        int initW = Math.min(Math.round(screenW * 0.92f), dp(480));
        int initH = Math.min(Math.round(screenH * 0.48f), dp(410));
        hudParams = new WindowManager.LayoutParams(
            initW,
            initH,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        hudParams.gravity = Gravity.TOP | Gravity.START;
        hudParams.x = Math.max(dp(8), (screenW - initW) / 2);
        hudParams.y = Math.max(dp(44), screenH - initH - dp(72));
        hudParams.alpha = hudAlpha;

        // Drag topBar to reposition HUD window
        topBar.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startX, startY;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startX = hudParams.x;
                        startY = hudParams.y;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        hudParams.x = Math.max(-hudParams.width / 3, Math.min(screenW - dp(60), Math.round(startX + e.getRawX() - downX)));
                        hudParams.y = Math.max(dp(18), Math.min(screenH - dp(60), Math.round(startY + e.getRawY() - downY)));
                        safeUpdate(hudRoot, hudParams);
                        return true;
                }
                return false;
            }
        });

        // Drag resizeHandle to resize width & height smoothly
        resizeHandle.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startW, startH;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startW = hudParams.width;
                        startH = hudParams.height;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int nw = Math.max(dp(240), Math.min(Math.round(screenW * 0.98f), Math.round(startW + e.getRawX() - downX)));
                        int nh = Math.max(dp(190), Math.min(Math.round(screenH * 0.84f), Math.round(startH + e.getRawY() - downY)));
                        hudParams.width = nw;
                        hudParams.height = nh;
                        safeUpdate(hudRoot, hudParams);
                        return true;
                }
                return false;
            }
        });

        // 3. Tiny Ghost-mode unlock edge pill
        ghostUnlockPill = new TextView(this);
        ghostUnlockPill.setText("Unlock HUD");
        ghostUnlockPill.setTextColor(Color.WHITE);
        ghostUnlockPill.setTextSize(12f);
        ghostUnlockPill.setTypeface(Typeface.DEFAULT_BOLD);
        ghostUnlockPill.setPadding(dp(10), dp(6), dp(10), dp(6));
        GradientDrawable gpBg = new GradientDrawable();
        gpBg.setColor(Color.parseColor("#DD5A1FA8"));
        gpBg.setCornerRadius(dp(18));
        gpBg.setStroke(dp(1), Color.parseColor("#FFD35C"));
        ghostUnlockPill.setBackground(gpBg);
        ghostUnlockPill.setOnClickListener(v -> setGhostMode(false));

        ghostUnlockParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        ghostUnlockParams.gravity = Gravity.TOP | Gravity.END;
        ghostUnlockParams.x = dp(8);
        ghostUnlockParams.y = dp(48);

        wm.addView(hudRoot, hudParams);
        wm.addView(bubbleRoot, bubbleParams);
        wm.addView(ghostUnlockPill, ghostUnlockParams);
        ghostUnlockPill.setVisibility(View.GONE);

        // Load KGuitar in lightweight Overlay HUD mode (served from assets/public/ on https://localhost)
        webView.loadUrl("https://localhost/?overlay=1");
    }

    private TextView makeBarBtn(String text, String desc) {
        TextView b = new TextView(this);
        b.setText(text);
        b.setContentDescription(desc);
        b.setTextColor(Color.WHITE);
        b.setTextSize(11f);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(7), dp(2), dp(7), dp(2));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#33FFFFFF"));
        bg.setCornerRadius(dp(6));
        b.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMarginStart(dp(3));
        b.setLayoutParams(lp);
        return b;
    }

    private void setExpanded(boolean exp) {
        expanded = exp;
        if (hudRoot != null) hudRoot.setVisibility(exp ? View.VISIBLE : View.GONE);
        if (bubbleRoot != null) bubbleRoot.setVisibility(exp ? View.GONE : View.VISIBLE);
        if (!exp && ghostMode) setGhostMode(false);
    }

    private void setGhostMode(boolean on) {
        ghostMode = on;
        if (hudParams == null || hudRoot == null) return;
        if (on) {
            hudParams.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
            hudParams.alpha = Math.min(hudAlpha, 0.58f);
            if (ghostUnlockPill != null) ghostUnlockPill.setVisibility(View.VISIBLE);
            if (hudGhostBtn != null) hudGhostBtn.setTextColor(Color.parseColor("#FFD35C"));
        } else {
            hudParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            hudParams.alpha = hudAlpha;
            if (ghostUnlockPill != null) ghostUnlockPill.setVisibility(View.GONE);
            if (hudGhostBtn != null) hudGhostBtn.setTextColor(Color.WHITE);
        }
        safeUpdate(hudRoot, hudParams);
    }

    private void setOpacity(float alpha) {
        hudAlpha = Math.max(0.25f, Math.min(1f, alpha));
        if (hudParams != null && hudRoot != null) {
            hudParams.alpha = ghostMode ? Math.min(hudAlpha, 0.58f) : hudAlpha;
            safeUpdate(hudRoot, hudParams);
        }
    }

    private void setFocusable(boolean focusable) {
        if (hudParams == null || hudRoot == null || ghostMode) return;
        if (focusable) {
            hudParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        } else {
            hudParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        }
        safeUpdate(hudRoot, hudParams);
    }

    private void setChordLabel(String text) {
        final String clean = text == null ? "" : text.trim();
        currentChord = clean;
        mainHandler.post(() -> {
            if (hudChordLabel != null) hudChordLabel.setText(clean);
            if (bubbleChordLabel != null) bubbleChordLabel.setText(clean.isEmpty() ? "KG" : "KG · " + clean);
        });
    }

    private void safeUpdate(View v, WindowManager.LayoutParams lp) {
        if (wm != null && v != null && v.isAttachedToWindow()) {
            try {
                wm.updateViewLayout(v, lp);
            } catch (Exception ignored) {
                // window detaching
            }
        }
    }

    private void openMainApp(String route) {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (route != null && !route.isEmpty()) {
            i.putExtra("kg_route", route);
            OverlayPlugin.setPendingRoute(route);
        }
        setExpanded(false);
        startActivity(i);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;
        if (hudParams != null && hudRoot != null) {
            hudParams.width = Math.min(hudParams.width, Math.round(screenW * 0.96f));
            hudParams.height = Math.min(hudParams.height, Math.round(screenH * 0.84f));
            hudParams.x = Math.max(0, Math.min(screenW - dp(60), hudParams.x));
            hudParams.y = Math.max(dp(18), Math.min(screenH - dp(60), hudParams.y));
            safeUpdate(hudRoot, hudParams);
        }
        if (bubbleParams != null && bubbleRoot != null) {
            bubbleParams.x = Math.max(dp(6), Math.min(screenW - dp(60), bubbleParams.x));
            bubbleParams.y = Math.max(dp(24), Math.min(screenH - dp(72), bubbleParams.y));
            safeUpdate(bubbleRoot, bubbleParams);
        }
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (webView != null) {
            try {
                webView.loadUrl("about:blank");
                webView.destroy();
            } catch (Exception ignored) {}
            webView = null;
        }
        removeQuietly(hudRoot);
        removeQuietly(bubbleRoot);
        removeQuietly(ghostUnlockPill);
        OverlayTileService.refreshTile(this);
        super.onDestroy();
    }

    private void removeQuietly(View v) {
        if (wm != null && v != null) {
            try { wm.removeViewImmediate(v); } catch (Exception ignored) {}
        }
    }

    /** JavaScript bridge exposed as `window.KGOverlayBridge` inside the overlay WebView. */
    private class OverlayJsBridge {
        @JavascriptInterface public void collapse() { mainHandler.post(() -> setExpanded(false)); }
        @JavascriptInterface public void expand() { mainHandler.post(() -> setExpanded(true)); }
        @JavascriptInterface public void close() { mainHandler.post(() -> stopSelf()); }
        @JavascriptInterface public void setGhost(boolean on) { mainHandler.post(() -> setGhostMode(on)); }
        @JavascriptInterface public void setOpacity(float a) { mainHandler.post(() -> OverlayService.this.setOpacity(a)); }
        @JavascriptInterface public void setChord(String text) { setChordLabel(text); }
        @JavascriptInterface public void setFocusable(boolean f) { mainHandler.post(() -> OverlayService.this.setFocusable(f)); }
        @JavascriptInterface public void openMain(String route) { mainHandler.post(() -> openMainApp(route)); }
    }

    /**
     * Serves Capacitor's bundled web app (`assets/public/...`) directly on https://localhost/ so the overlay
     * works independently while Songsterr/YouTube is in the foreground and shares localStorage with MainActivity.
     */
    private static class OverlayAssetClient extends WebViewClient {
        private final AssetManager assets;

        OverlayAssetClient(Context ctx) {
            this.assets = ctx.getAssets();
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (url == null || !"localhost".equalsIgnoreCase(url.getHost())) {
                return super.shouldInterceptRequest(view, request);
            }
            String path = url.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) {
                path = "index.html";
            } else if (path.startsWith("/")) {
                path = path.substring(1);
            }
            try {
                InputStream in = assets.open("public/" + path);
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-cache");
                headers.put("Access-Control-Allow-Origin", "*");
                return new WebResourceResponse(mimeOf(path), encodingOf(path), 200, "OK", headers, in);
            } catch (IOException e) {
                // SPA fallback to index.html for extensionless routes
                if (!path.contains(".")) {
                    try {
                        InputStream in = assets.open("public/index.html");
                        return new WebResourceResponse("text/html", "utf-8", 200, "OK", new HashMap<>(), in);
                    } catch (IOException ignored) {}
                }
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
            }
        }

        private static String mimeOf(String p) {
            String n = p.toLowerCase(Locale.ROOT);
            if (n.endsWith(".html") || n.endsWith(".htm")) return "text/html";
            if (n.endsWith(".js") || n.endsWith(".mjs")) return "application/javascript";
            if (n.endsWith(".css")) return "text/css";
            if (n.endsWith(".json")) return "application/json";
            if (n.endsWith(".svg")) return "image/svg+xml";
            if (n.endsWith(".png")) return "image/png";
            if (n.endsWith(".webp")) return "image/webp";
            if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
            if (n.endsWith(".woff2")) return "font/woff2";
            if (n.endsWith(".woff")) return "font/woff";
            if (n.endsWith(".wasm")) return "application/wasm";
            if (n.endsWith(".mp3")) return "audio/mpeg";
            if (n.endsWith(".wav")) return "audio/wav";
            if (n.endsWith(".ogg")) return "audio/ogg";
            return "application/octet-stream";
        }

        private static String encodingOf(String p) {
            String n = p.toLowerCase(Locale.ROOT);
            if (n.endsWith(".html") || n.endsWith(".js") || n.endsWith(".mjs") || n.endsWith(".css") || n.endsWith(".json") || n.endsWith(".svg")) {
                return "utf-8";
            }
            return null;
        }
    }
}
