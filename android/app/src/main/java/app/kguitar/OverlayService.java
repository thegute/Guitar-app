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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Multi-bubble floating KGuitar HUD overlay over ANY Android app (Songsterr, YouTube, Spotify, etc.).
 * Supports up to 4 simultaneous independent floating bubbles (e.g. Fretboard + Hand Fingers + Circle + Licks),
 * each with its own drag bar, corner resize, opacity, Ghost click-through mode, and edge-snapping collapsed pill,
 * all sharing https://localhost localStorage & BroadcastChannel so Live Ear updates every bubble in lockstep!
 */
public class OverlayService extends Service {

    public static final String ACTION_START = "app.kguitar.OVERLAY_START";
    public static final String ACTION_ADD = "app.kguitar.OVERLAY_ADD";
    public static final String ACTION_STOP = "app.kguitar.OVERLAY_STOP";
    public static final String ACTION_EXPAND = "app.kguitar.OVERLAY_EXPAND";
    public static final String ACTION_COLLAPSE = "app.kguitar.OVERLAY_COLLAPSE";
    public static final String EXTRA_START_EXPANDED = "expanded";
    public static final String EXTRA_TAB = "tab";

    private static final int MAX_WINDOWS = 4;
    private static final String CHANNEL_ID = "kguitar-overlay";
    private static final int NOTIF_ID = 14;
    private static final String[] SMART_TABS = { "neck", "hand", "circle", "licks" };

    private static volatile OverlayService instance;

    public static boolean isRunning() {
        return instance != null && !instance.windows.isEmpty();
    }

    public static int windowCount() {
        OverlayService svc = instance;
        return svc == null ? 0 : svc.windows.size();
    }

    public static void updateChordText(String text) {
        OverlayService svc = instance;
        if (svc != null) svc.setAllChordLabels(text);
    }

    private WindowManager wm;
    private Handler mainHandler;
    private float density = 1f;
    private int screenW = 1080;
    private int screenH = 1920;

    private final List<OverlayWindow> windows = new ArrayList<>();
    private int nextWinId = 1;
    private String lastChordLabel = "";

    // Shared tiny unlock pill shown whenever 1+ windows are in Ghost click-through mode
    private TextView ghostUnlockPill;
    private WindowManager.LayoutParams ghostUnlockParams;

    private static class OverlayWindow {
        final int id;
        String tab;
        LinearLayout hudRoot;
        WindowManager.LayoutParams hudParams;
        TextView hudTitleLabel;
        TextView hudChordLabel;
        TextView hudGhostBtn;
        WebView webView;
        LinearLayout bubbleRoot;
        WindowManager.LayoutParams bubbleParams;
        TextView bubbleLabel;
        boolean expanded = true;
        boolean ghostMode = false;
        float alpha = 0.96f;

        OverlayWindow(int id, String tab) {
            this.id = id;
            this.tab = tab;
        }
    }

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
        ensureGhostPill();

        String wantTab = intent != null ? intent.getStringExtra(EXTRA_TAB) : null;
        boolean startExp = intent == null || intent.getBooleanExtra(EXTRA_START_EXPANDED, true);

        if (ACTION_ADD.equals(action)) {
            spawnWindow(wantTab, true);
        } else if (windows.isEmpty()) {
            spawnWindow(wantTab != null && !wantTab.isEmpty() ? wantTab : "neck", startExp);
        } else if (ACTION_EXPAND.equals(action)) {
            for (OverlayWindow w : windows) {
                setWindowGhost(w, false);
                setWindowExpanded(w, true);
            }
        } else if (ACTION_COLLAPSE.equals(action)) {
            for (OverlayWindow w : windows) {
                setWindowGhost(w, false);
                setWindowExpanded(w, false);
            }
        } else if (wantTab != null && !wantTab.isEmpty()) {
            spawnWindow(wantTab, true);
        } else {
            // Re-tapping start expands existing bubbles
            for (OverlayWindow w : windows) setWindowExpanded(w, true);
        }
        updateNotification();
        OverlayTileService.refreshTile(this);
        return START_STICKY;
    }

    private Notification buildNotification() {
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent expandPi = PendingIntent.getService(this, 1, new Intent(this, OverlayService.class).setAction(ACTION_EXPAND), piFlags);
        PendingIntent addPi = PendingIntent.getService(this, 3, new Intent(this, OverlayService.class).setAction(ACTION_ADD), piFlags);
        PendingIntent stopPi = PendingIntent.getService(this, 2, new Intent(this, OverlayService.class).setAction(ACTION_STOP), piFlags);
        int count = Math.max(1, windows.size());
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_kguitar)
            .setContentTitle(count > 1 ? "KGuitar (" + count + " floating bubbles)" : "KGuitar Bubble is floating")
            .setContentText("Tap to expand, + Bubble to add another, or Close all")
            .setOngoing(true)
            .setContentIntent(expandPi)
            .addAction(0, "Expand", expandPi)
            .addAction(0, "+ Bubble", addPi)
            .addAction(0, "Close all", stopPi)
            .build();
    }

    private void startOverlayForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "KGuitar Floating Bubble", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Keeps KGuitar fretboard, hand fingers & live chord bubbles floating over other apps");
            nm.createNotificationChannel(ch);
        }
        Notification notif = buildNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            boolean hasMic = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            int fgsType = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
            if (hasMic) fgsType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            startForeground(NOTIF_ID, notif, fgsType);
        } else if (Build.VERSION.SDK_INT >= 29) {
            boolean hasMic = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            if (hasMic) startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            else startForeground(NOTIF_ID, notif);
        } else {
            startForeground(NOTIF_ID, notif);
        }
    }

    private void updateNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && !windows.isEmpty()) {
            try { nm.notify(NOTIF_ID, buildNotification()); } catch (Exception ignored) {}
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

    private void ensureGhostPill() {
        if (ghostUnlockPill != null) return;
        ghostUnlockPill = new TextView(this);
        ghostUnlockPill.setText("Unlock HUD");
        ghostUnlockPill.setTextColor(Color.WHITE);
        ghostUnlockPill.setTextSize(11.5f);
        ghostUnlockPill.setTypeface(Typeface.DEFAULT_BOLD);
        ghostUnlockPill.setPadding(dp(10), dp(5), dp(10), dp(5));
        GradientDrawable gpBg = new GradientDrawable();
        gpBg.setColor(Color.parseColor("#DD5A1FA8"));
        gpBg.setCornerRadius(dp(18));
        gpBg.setStroke(dp(1), Color.parseColor("#FFD35C"));
        ghostUnlockPill.setBackground(gpBg);
        ghostUnlockPill.setOnClickListener(v -> {
            for (OverlayWindow w : windows) setWindowGhost(w, false);
        });

        ghostUnlockParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        ghostUnlockParams.gravity = Gravity.TOP | Gravity.END;
        ghostUnlockParams.x = dp(8);
        ghostUnlockParams.y = dp(44);
        wm.addView(ghostUnlockPill, ghostUnlockParams);
        ghostUnlockPill.setVisibility(View.GONE);
    }

    private String pickNextSmartTab() {
        for (String candidate : SMART_TABS) {
            boolean used = false;
            for (OverlayWindow w : windows) {
                if (candidate.equals(w.tab)) { used = true; break; }
            }
            if (!used) return candidate;
        }
        return SMART_TABS[windows.size() % SMART_TABS.length];
    }

    private static String tabShortTitle(String tab) {
        if ("hand".equals(tab)) return "Hand";
        if ("circle".equals(tab)) return "Circle";
        if ("licks".equals(tab)) return "Licks";
        if ("tools".equals(tab)) return "Tools";
        return "Neck";
    }

    @SuppressLint({ "SetJavaScriptEnabled", "ClickableViewAccessibility" })
    private void spawnWindow(String requestedTab, boolean startExpanded) {
        if (windows.size() >= MAX_WINDOWS) {
            // Focus/expand existing windows rather than exceeding safe memory limit
            for (OverlayWindow w : windows) setWindowExpanded(w, true);
            return;
        }
        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;

        final String tab = (requestedTab != null && !requestedTab.isEmpty()) ? requestedTab : pickNextSmartTab();
        final int slot = windows.size();
        final OverlayWindow win = new OverlayWindow(nextWinId++, tab);

        // 1. Collapsed Edge Pill (staggered vertically per slot so pills never stack)
        win.bubbleRoot = new LinearLayout(this);
        win.bubbleRoot.setOrientation(LinearLayout.HORIZONTAL);
        win.bubbleRoot.setGravity(Gravity.CENTER_VERTICAL);
        win.bubbleRoot.setPadding(dp(10), dp(6), dp(10), dp(6));
        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setColor(Color.parseColor("#EE1D0B38"));
        pillBg.setCornerRadius(dp(22));
        pillBg.setStroke(dp(2), Color.parseColor("#B66BFF"));
        win.bubbleRoot.setBackground(pillBg);
        win.bubbleRoot.setElevation(dp(8));

        win.bubbleLabel = new TextView(this);
        win.bubbleLabel.setText(formatPillText(win));
        win.bubbleLabel.setTextColor(Color.WHITE);
        win.bubbleLabel.setTextSize(13f);
        win.bubbleLabel.setTypeface(Typeface.DEFAULT_BOLD);
        win.bubbleRoot.addView(win.bubbleLabel);

        win.bubbleParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        win.bubbleParams.gravity = Gravity.TOP | Gravity.START;
        win.bubbleParams.x = screenW - dp(96);
        win.bubbleParams.y = Math.min(screenH - dp(90), Math.round(screenH * 0.16f) + slot * dp(50));

        win.bubbleRoot.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startX, startY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startX = win.bubbleParams.x;
                        startY = win.bubbleParams.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX;
                        float dy = e.getRawY() - downY;
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true;
                        win.bubbleParams.x = Math.max(0, Math.min(screenW - v.getWidth(), Math.round(startX + dx)));
                        win.bubbleParams.y = Math.max(dp(24), Math.min(screenH - dp(72), Math.round(startY + dy)));
                        safeUpdate(win.bubbleRoot, win.bubbleParams);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) {
                            setWindowExpanded(win, true);
                        } else {
                            int mid = win.bubbleParams.x + v.getWidth() / 2;
                            win.bubbleParams.x = mid < screenW / 2 ? dp(6) : Math.max(dp(6), screenW - v.getWidth() - dp(6));
                            safeUpdate(win.bubbleRoot, win.bubbleParams);
                        }
                        return true;
                }
                return false;
            }
        });

        // 2. Expanded HUD Window
        win.hudRoot = new LinearLayout(this);
        win.hudRoot.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable hudBg = new GradientDrawable();
        hudBg.setColor(Color.parseColor("#F2120824"));
        hudBg.setCornerRadius(dp(14));
        hudBg.setStroke(dp(1), Color.parseColor("#9B5CFF"));
        win.hudRoot.setBackground(hudBg);
        win.hudRoot.setElevation(dp(12));
        win.hudRoot.setClipToOutline(true);

        // Slim native top drag bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dp(8), dp(2), dp(5), dp(2));
        topBar.setBackgroundColor(Color.parseColor("#E6220D42"));

        win.hudTitleLabel = new TextView(this);
        win.hudTitleLabel.setText("⠿ " + tabShortTitle(tab));
        win.hudTitleLabel.setTextColor(Color.parseColor("#E6D4FF"));
        win.hudTitleLabel.setTextSize(11.5f);
        win.hudTitleLabel.setTypeface(Typeface.DEFAULT_BOLD);
        topBar.addView(win.hudTitleLabel);

        win.hudChordLabel = new TextView(this);
        win.hudChordLabel.setText(lastChordLabel);
        win.hudChordLabel.setTextColor(Color.parseColor("#FFD35C"));
        win.hudChordLabel.setTextSize(11.5f);
        win.hudChordLabel.setTypeface(Typeface.DEFAULT_BOLD);
        win.hudChordLabel.setSingleLine(true);
        win.hudChordLabel.setPadding(dp(6), 0, dp(4), 0);
        LinearLayout.LayoutParams chordLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        topBar.addView(win.hudChordLabel, chordLp);

        TextView addBtn = makeBarBtn("+", "Open another bubble");
        addBtn.setOnClickListener(v -> spawnWindow(null, true));
        topBar.addView(addBtn);

        win.hudGhostBtn = makeBarBtn("Ghost", "Click-through mode");
        win.hudGhostBtn.setOnClickListener(v -> setWindowGhost(win, !win.ghostMode));
        topBar.addView(win.hudGhostBtn);

        TextView minBtn = makeBarBtn("–", "Shrink to bubble");
        minBtn.setOnClickListener(v -> setWindowExpanded(win, false));
        topBar.addView(minBtn);

        TextView closeBtn = makeBarBtn("×", "Close this bubble");
        closeBtn.setOnClickListener(v -> removeWindow(win));
        topBar.addView(closeBtn);

        win.hudRoot.addView(topBar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // Body container with WebView + bottom-right resize grip
        FrameLayout bodyWrap = new FrameLayout(this);
        win.webView = new WebView(this);
        win.webView.setBackgroundColor(Color.TRANSPARENT);
        WebSettings ws = win.webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setDatabaseEnabled(true);
        win.webView.setWebViewClient(new OverlayAssetClient(this));
        win.webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (ContextCompat.checkSelfPermission(OverlayService.this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    request.deny();
                }
            }
        });
        win.webView.addJavascriptInterface(new OverlayJsBridge(win), "KGOverlayBridge");
        bodyWrap.addView(win.webView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView resizeHandle = new TextView(this);
        resizeHandle.setText("◢");
        resizeHandle.setTextColor(Color.parseColor("#CCB68CFF"));
        resizeHandle.setTextSize(14f);
        resizeHandle.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams rhLp = new FrameLayout.LayoutParams(dp(28), dp(28), Gravity.BOTTOM | Gravity.END);
        bodyWrap.addView(resizeHandle, rhLp);

        win.hudRoot.addView(bodyWrap, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        // Smart non-overlapping starting position & size per bubble slot
        int initW, initH, initX, initY;
        if (slot == 0) {
            initW = Math.min(Math.round(screenW * 0.92f), dp(480));
            initH = Math.min(Math.round(screenH * 0.44f), dp(380));
            initX = Math.max(dp(8), (screenW - initW) / 2);
            initY = Math.max(dp(44), screenH - initH - dp(60));
        } else if (slot == 1) {
            initW = Math.min(Math.round(screenW * 0.62f), dp(320));
            initH = Math.min(Math.round(screenH * 0.34f), dp(280));
            initX = Math.max(dp(8), screenW - initW - dp(10));
            initY = dp(52);
        } else if (slot == 2) {
            initW = Math.min(Math.round(screenW * 0.60f), dp(310));
            initH = Math.min(Math.round(screenH * 0.36f), dp(310));
            initX = dp(10);
            initY = dp(56);
        } else {
            initW = Math.min(Math.round(screenW * 0.66f), dp(340));
            initH = Math.min(Math.round(screenH * 0.34f), dp(280));
            initX = Math.max(dp(8), (screenW - initW) / 2);
            initY = Math.round(screenH * 0.25f);
        }

        win.hudParams = new WindowManager.LayoutParams(
            initW,
            initH,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        win.hudParams.gravity = Gravity.TOP | Gravity.START;
        win.hudParams.x = initX;
        win.hudParams.y = initY;
        win.hudParams.alpha = win.alpha;

        topBar.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startX, startY;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startX = win.hudParams.x;
                        startY = win.hudParams.y;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        win.hudParams.x = Math.max(-win.hudParams.width / 3, Math.min(screenW - dp(60), Math.round(startX + e.getRawX() - downX)));
                        win.hudParams.y = Math.max(dp(18), Math.min(screenH - dp(60), Math.round(startY + e.getRawY() - downY)));
                        safeUpdate(win.hudRoot, win.hudParams);
                        return true;
                }
                return false;
            }
        });

        resizeHandle.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startW, startH;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startW = win.hudParams.width;
                        startH = win.hudParams.height;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int nw = Math.max(dp(210), Math.min(Math.round(screenW * 0.98f), Math.round(startW + e.getRawX() - downX)));
                        int nh = Math.max(dp(150), Math.min(Math.round(screenH * 0.86f), Math.round(startH + e.getRawY() - downY)));
                        win.hudParams.width = nw;
                        win.hudParams.height = nh;
                        safeUpdate(win.hudRoot, win.hudParams);
                        return true;
                }
                return false;
            }
        });

        wm.addView(win.hudRoot, win.hudParams);
        wm.addView(win.bubbleRoot, win.bubbleParams);
        windows.add(win);
        setWindowExpanded(win, startExpanded);

        win.webView.loadUrl("https://localhost/?overlay=1&wid=" + win.id + "&tab=" + Uri.encode(tab));
        updateNotification();
    }

    private void removeWindow(OverlayWindow win) {
        windows.remove(win);
        if (win.webView != null) {
            try {
                win.webView.loadUrl("about:blank");
                win.webView.destroy();
            } catch (Exception ignored) {}
            win.webView = null;
        }
        removeQuietly(win.hudRoot);
        removeQuietly(win.bubbleRoot);
        refreshGhostUnlockVisibility();
        if (windows.isEmpty()) {
            stopSelf();
        } else {
            updateNotification();
        }
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

    private void setWindowExpanded(OverlayWindow w, boolean exp) {
        w.expanded = exp;
        if (w.hudRoot != null) w.hudRoot.setVisibility(exp ? View.VISIBLE : View.GONE);
        if (w.bubbleRoot != null) w.bubbleRoot.setVisibility(exp ? View.GONE : View.VISIBLE);
        if (!exp && w.ghostMode) setWindowGhost(w, false);
    }

    private void setWindowGhost(OverlayWindow w, boolean on) {
        w.ghostMode = on;
        if (w.hudParams == null || w.hudRoot == null) return;
        if (on) {
            w.hudParams.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
            w.hudParams.alpha = Math.min(w.alpha, 0.58f);
            if (w.hudGhostBtn != null) w.hudGhostBtn.setTextColor(Color.parseColor("#FFD35C"));
        } else {
            w.hudParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            w.hudParams.alpha = w.alpha;
            if (w.hudGhostBtn != null) w.hudGhostBtn.setTextColor(Color.WHITE);
        }
        safeUpdate(w.hudRoot, w.hudParams);
        refreshGhostUnlockVisibility();
    }

    private void refreshGhostUnlockVisibility() {
        if (ghostUnlockPill == null) return;
        boolean anyGhost = false;
        for (OverlayWindow w : windows) {
            if (w.ghostMode && w.expanded) { anyGhost = true; break; }
        }
        ghostUnlockPill.setVisibility(anyGhost ? View.VISIBLE : View.GONE);
    }

    private void setWindowOpacity(OverlayWindow w, float alpha) {
        w.alpha = Math.max(0.25f, Math.min(1f, alpha));
        if (w.hudParams != null && w.hudRoot != null) {
            w.hudParams.alpha = w.ghostMode ? Math.min(w.alpha, 0.58f) : w.alpha;
            safeUpdate(w.hudRoot, w.hudParams);
        }
    }

    private void setWindowFocusable(OverlayWindow w, boolean focusable) {
        if (w.hudParams == null || w.hudRoot == null || w.ghostMode) return;
        if (focusable) w.hudParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        else w.hudParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        safeUpdate(w.hudRoot, w.hudParams);
    }

    private String formatPillText(OverlayWindow w) {
        String prefix = tabShortTitle(w.tab);
        return lastChordLabel.isEmpty() ? prefix : prefix + " · " + lastChordLabel.split("·")[0].trim();
    }

    private void setAllChordLabels(String text) {
        final String clean = text == null ? "" : text.trim();
        lastChordLabel = clean;
        mainHandler.post(() -> {
            for (OverlayWindow w : windows) {
                if (w.hudChordLabel != null) w.hudChordLabel.setText(clean);
                if (w.bubbleLabel != null) w.bubbleLabel.setText(formatPillText(w));
            }
        });
    }

    private void setWindowTabLabel(OverlayWindow w, String tab) {
        if (tab == null || tab.isEmpty()) return;
        w.tab = tab;
        mainHandler.post(() -> {
            if (w.hudTitleLabel != null) w.hudTitleLabel.setText("⠿ " + tabShortTitle(tab));
            if (w.bubbleLabel != null) w.bubbleLabel.setText(formatPillText(w));
        });
    }

    private void safeUpdate(View v, WindowManager.LayoutParams lp) {
        if (wm != null && v != null && v.isAttachedToWindow()) {
            try { wm.updateViewLayout(v, lp); } catch (Exception ignored) {}
        }
    }

    private void openMainApp(String route) {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (route != null && !route.isEmpty()) {
            i.putExtra("kg_route", route);
            OverlayPlugin.setPendingRoute(route);
        }
        for (OverlayWindow w : windows) setWindowExpanded(w, false);
        startActivity(i);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;
        for (OverlayWindow w : windows) {
            if (w.hudParams != null && w.hudRoot != null) {
                w.hudParams.width = Math.min(w.hudParams.width, Math.round(screenW * 0.96f));
                w.hudParams.height = Math.min(w.hudParams.height, Math.round(screenH * 0.86f));
                w.hudParams.x = Math.max(0, Math.min(screenW - dp(60), w.hudParams.x));
                w.hudParams.y = Math.max(dp(18), Math.min(screenH - dp(60), w.hudParams.y));
                safeUpdate(w.hudRoot, w.hudParams);
            }
            if (w.bubbleParams != null && w.bubbleRoot != null) {
                w.bubbleParams.x = Math.max(dp(6), Math.min(screenW - dp(60), w.bubbleParams.x));
                w.bubbleParams.y = Math.max(dp(24), Math.min(screenH - dp(72), w.bubbleParams.y));
                safeUpdate(w.bubbleRoot, w.bubbleParams);
            }
        }
    }

    @Override
    public void onDestroy() {
        instance = null;
        for (OverlayWindow w : new ArrayList<>(windows)) {
            if (w.webView != null) {
                try {
                    w.webView.loadUrl("about:blank");
                    w.webView.destroy();
                } catch (Exception ignored) {}
                w.webView = null;
            }
            removeQuietly(w.hudRoot);
            removeQuietly(w.bubbleRoot);
        }
        windows.clear();
        removeQuietly(ghostUnlockPill);
        ghostUnlockPill = null;
        OverlayTileService.refreshTile(this);
        super.onDestroy();
    }

    private void removeQuietly(View v) {
        if (wm != null && v != null) {
            try { wm.removeViewImmediate(v); } catch (Exception ignored) {}
        }
    }

    /** Per-window JS bridge exposed as `window.KGOverlayBridge` inside each overlay WebView. */
    private class OverlayJsBridge {
        private final OverlayWindow win;

        OverlayJsBridge(OverlayWindow win) {
            this.win = win;
        }

        @JavascriptInterface public void collapse() { mainHandler.post(() -> setWindowExpanded(win, false)); }
        @JavascriptInterface public void expand() { mainHandler.post(() -> setWindowExpanded(win, true)); }
        @JavascriptInterface public void close() { mainHandler.post(() -> removeWindow(win)); }
        @JavascriptInterface public void setGhost(boolean on) { mainHandler.post(() -> setWindowGhost(win, on)); }
        @JavascriptInterface public void setOpacity(float a) { mainHandler.post(() -> setWindowOpacity(win, a)); }
        @JavascriptInterface public void setChord(String text) { setAllChordLabels(text); }
        @JavascriptInterface public void setTab(String tab) { setWindowTabLabel(win, tab); }
        @JavascriptInterface public void setFocusable(boolean f) { mainHandler.post(() -> setWindowFocusable(win, f)); }
        @JavascriptInterface public void addBubble(String tab) { mainHandler.post(() -> spawnWindow(tab, true)); }
        @JavascriptInterface public void openMain(String route) { mainHandler.post(() -> openMainApp(route)); }
    }

    /** Serves Capacitor's bundled web app (`assets/public/...`) directly on https://localhost/. */
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
