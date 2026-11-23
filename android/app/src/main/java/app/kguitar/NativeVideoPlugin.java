package app.kguitar;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.VideoSize;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native in-app video engine powered by Jetpack Media3 ExoPlayer.
 * Reads local SAF content:// course videos directly from Android storage using hardware/software MediaCodec
 * decoders, avoiding Chromium WebView's strict FFmpegAudioDecoder error 3 failures on mp42/AAC/MOV/MPEG-TS files.
 */
@CapacitorPlugin(name = "NativeVideo")
public class NativeVideoPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());
    private ExoPlayer player;
    private FrameLayout host;
    private TextureView textureView;
    private TextView cleanRestoreBtn;

    private int videoW = 0;
    private int videoH = 0;
    private int hostW = 0;
    private int hostH = 0;
    private int errorRetries = 0;
    private boolean tickerRunning = false;
    private boolean pendingAutoplay = false;
    private long pendingSeekMs = -1L;

    private boolean hasBounds = false;
    private double bX = 0, bY = 0, bW = 0, bH = 0, bVw = 0, bVh = 0, bClipTop = 0, bClipBottom = 99999;
    private boolean bVisible = false, bMirror = false, bCleanMode = false;
    private float bOpacity = 1.0f;

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            if (!tickerRunning || player == null) return;
            emitState();
            main.postDelayed(this, 200);
        }
    };

    private final Player.Listener playerListener = new Player.Listener() {
        @Override
        public void onPlaybackStateChanged(int playbackState) {
            if (playbackState == Player.STATE_READY && player != null) {
                errorRetries = 0;
                if (pendingSeekMs > 0) {
                    long dur = player.getDuration();
                    long target = dur > 5000 ? Math.min(pendingSeekMs, dur - 3000) : pendingSeekMs;
                    pendingSeekMs = -1L;
                    if (target > 0) player.seekTo(target);
                }
                if (pendingAutoplay) {
                    pendingAutoplay = false;
                    player.play();
                }
            }
            emitState();
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            emitState();
        }

        @Override
        public void onVideoSizeChanged(VideoSize videoSize) {
            if (videoSize != null && videoSize.width > 0 && videoSize.height > 0) {
                videoW = videoSize.width;
                videoH = videoSize.height;
                layoutVideoAspect();
                emitState();
            }
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            if (player != null && errorRetries < 2 && (
                error.errorCode == PlaybackException.ERROR_CODE_DECODING_FAILED
                    || error.errorCode == PlaybackException.ERROR_CODE_AUDIO_TRACK_WRITE_FAILED
                    || error.errorCode == PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED
            )) {
                errorRetries++;
                long pos = Math.max(0L, player.getCurrentPosition());
                long nextPos = pos > 0 ? pos + 400L : 0L;
                player.prepare();
                if (nextPos > 0) player.seekTo(nextPos);
                player.play();
                return;
            }
            JSObject err = new JSObject();
            err.put("code", error.getErrorCodeName());
            err.put("message", error.getMessage() != null ? error.getMessage() : "Playback error");
            notifyListeners("error", err);
            emitState();
        }
    };

    @OptIn(markerClass = UnstableApi.class)
    private void ensurePlayerAndView() {
        Activity act = getActivity();
        if (act == null || getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent == null) return;

        if (host == null) {
            Context ctx = getContext();
            host = new FrameLayout(ctx);
            host.setBackgroundColor(Color.BLACK);
            host.setClipChildren(true);
            host.setClipToPadding(true);
            host.setVisibility(View.GONE);
            host.setElevation(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 8, ctx.getResources().getDisplayMetrics()));
            host.setOnClickListener(v -> {
                if (player == null) return;
                if (player.getPlaybackState() == Player.STATE_ENDED) {
                    player.seekTo(0);
                    player.play();
                } else if (player.isPlaying()) {
                    player.pause();
                } else {
                    player.play();
                }
                emitState();
            });

            textureView = new TextureView(ctx);
            FrameLayout.LayoutParams tvLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            );
            host.addView(textureView, tvLp);

            // Translucent corner restore button shown only in Clean Fill Floating Window mode
            cleanRestoreBtn = new TextView(ctx);
            cleanRestoreBtn.setText("☰");
            cleanRestoreBtn.setTextColor(Color.WHITE);
            cleanRestoreBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
            cleanRestoreBtn.setGravity(Gravity.CENTER);
            GradientDrawable bg = new GradientDrawable();
            bg.setColor(0xB814161D);
            bg.setCornerRadius(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 8, ctx.getResources().getDisplayMetrics()));
            bg.setStroke(2, 0x55FFFFFF);
            cleanRestoreBtn.setBackground(bg);
            int sz = Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 32, ctx.getResources().getDisplayMetrics()));
            int pad = Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 6, ctx.getResources().getDisplayMetrics()));
            FrameLayout.LayoutParams btnLp = new FrameLayout.LayoutParams(sz, sz, Gravity.TOP | Gravity.END);
            btnLp.setMargins(0, pad, pad, 0);
            cleanRestoreBtn.setVisibility(View.GONE);
            cleanRestoreBtn.setOnClickListener(v -> notifyListeners("restoreClean", new JSObject()));
            host.addView(cleanRestoreBtn, btnLp);

            parent.addView(host, new ViewGroup.LayoutParams(1, 1));
        }

        if (player == null) {
            Context ctx = getContext();
            DefaultRenderersFactory rf = new DefaultRenderersFactory(ctx)
                .setEnableDecoderFallback(true);
            player = new ExoPlayer.Builder(ctx, rf).build();
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build();
            // Do not steal audio focus from KGuitar's own metronome / tuner / backing tracks
            player.setAudioAttributes(attrs, false);
            player.setVideoTextureView(textureView);
            player.addListener(playerListener);
        }
    }

    private void layoutVideoAspect() {
        if (textureView == null || hostW <= 0 || hostH <= 0) return;
        int tvW = hostW;
        int tvH = hostH;
        if (videoW > 0 && videoH > 0) {
            float videoAspect = (float) videoW / (float) videoH;
            float hostAspect = (float) hostW / (float) hostH;
            if (videoAspect > hostAspect) {
                tvW = hostW;
                tvH = Math.max(1, Math.round(hostW / videoAspect));
            } else {
                tvH = hostH;
                tvW = Math.max(1, Math.round(hostH * videoAspect));
            }
        }
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) textureView.getLayoutParams();
        if (lp != null && (lp.width != tvW || lp.height != tvH)) {
            lp.width = tvW;
            lp.height = tvH;
            lp.gravity = Gravity.CENTER;
            textureView.setLayoutParams(lp);
        }
    }

    private void applyLastBounds() {
        if (!hasBounds || host == null || getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        int webW = webView.getWidth();
        int webH = webView.getHeight();
        if (!bVisible || bW < 10 || bH < 10 || bVw <= 0 || bVh <= 0 || webW <= 0 || webH <= 0) {
            host.setVisibility(View.GONE);
            return;
        }

        float sx = webW / (float) bVw;
        float sy = webH / (float) bVh;
        int px = webView.getLeft() + Math.round((float) bX * sx);
        int py = webView.getTop() + Math.round((float) bY * sy);
        int pw = Math.max(1, Math.round((float) bW * sx));
        int ph = Math.max(1, Math.round((float) bH * sy));

        int cTopPx = webView.getTop() + Math.round((float) bClipTop * sy);
        int cBotPx = webView.getTop() + Math.round((float) bClipBottom * sy);
        int visTop = Math.max(py, cTopPx);
        int visBot = Math.min(py + ph, cBotPx);
        if (visBot <= visTop + 4) {
            host.setVisibility(View.GONE);
            return;
        }

        hostW = pw;
        hostH = ph;
        ViewGroup.LayoutParams lp = host.getLayoutParams();
        if (lp.width != pw || lp.height != ph) {
            lp.width = pw;
            lp.height = ph;
            host.setLayoutParams(lp);
        }
        host.setX(px);
        host.setY(py);
        host.setAlpha(Math.max(0.15f, Math.min(1.0f, bOpacity)));
        if (visTop > py || visBot < py + ph) {
            host.setClipBounds(new Rect(0, Math.max(0, visTop - py), pw, Math.max(0, visBot - py)));
        } else {
            host.setClipBounds(null);
        }
        if (textureView != null) {
            textureView.setScaleX(bMirror ? -1f : 1f);
        }
        if (cleanRestoreBtn != null) {
            cleanRestoreBtn.setVisibility(bCleanMode ? View.VISIBLE : View.GONE);
        }
        layoutVideoAspect();
        if (host.getVisibility() != View.VISIBLE) {
            host.setVisibility(View.VISIBLE);
        }
        host.bringToFront();
    }

    private void emitState() {
        if (player == null) return;
        JSObject s = new JSObject();
        long posMs = Math.max(0L, player.getCurrentPosition());
        long durMs = player.getDuration();
        int st = player.getPlaybackState();
        s.put("time", posMs / 1000.0);
        s.put("duration", durMs > 0 ? durMs / 1000.0 : 0.0);
        s.put("playing", player.isPlaying());
        s.put("ready", st == Player.STATE_READY || st == Player.STATE_ENDED);
        s.put("buffering", st == Player.STATE_BUFFERING);
        s.put("ended", st == Player.STATE_ENDED);
        s.put("rate", player.getPlaybackParameters().speed);
        s.put("muted", player.getVolume() <= 0.01f);
        s.put("videoWidth", videoW);
        s.put("videoHeight", videoH);
        notifyListeners("state", s);
    }

    private void startTicker() {
        if (tickerRunning) return;
        tickerRunning = true;
        main.postDelayed(ticker, 200);
    }

    private void stopTicker() {
        tickerRunning = false;
        main.removeCallbacks(ticker);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("Missing video URI");
            return;
        }
        Uri uri = Uri.parse(uriStr);
        if (!MediaWebViewClient.allowed(getContext(), uri)) {
            call.reject("Folder permission expired — re-pick your course folder in Learn → Your video lessons.");
            return;
        }
        double startSec = call.getDouble("startSec", 0.0);
        float rate = call.getFloat("rate", 1.0f);
        boolean muted = call.getBoolean("muted", false);
        boolean autoplay = call.getBoolean("autoplay", false);

        main.post(() -> {
            try {
                ensurePlayerAndView();
                if (player == null) {
                    call.reject("Player unavailable");
                    return;
                }
                videoW = 0;
                videoH = 0;
                errorRetries = 0;
                pendingAutoplay = autoplay;
                pendingSeekMs = startSec > 0.5 ? Math.round(startSec * 1000.0) : -1L;

                applyLastBounds();
                player.stop();
                player.clearMediaItems();
                player.setPlaybackParameters(new PlaybackParameters(Math.max(0.25f, Math.min(2.0f, rate))));
                player.setVolume(muted ? 0f : 1f);
                player.setMediaItem(MediaItem.fromUri(uri));
                player.prepare();
                startTicker();
                emitState();
                call.resolve();
            } catch (Exception e) {
                call.reject("Couldn't open video: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setBounds(PluginCall call) {
        double x = call.getDouble("x", 0.0);
        double y = call.getDouble("y", 0.0);
        double w = call.getDouble("w", 0.0);
        double h = call.getDouble("h", 0.0);
        double vw = call.getDouble("vw", 0.0);
        double vh = call.getDouble("vh", 0.0);
        double clipTop = call.getDouble("clipTop", 0.0);
        double clipBottom = call.getDouble("clipBottom", 99999.0);
        boolean visible = call.getBoolean("visible", true);
        float opacity = call.getFloat("opacity", 1.0f);
        boolean mirror = call.getBoolean("mirror", false);
        boolean cleanMode = call.getBoolean("cleanMode", false);

        main.post(() -> {
            hasBounds = true;
            bX = x;
            bY = y;
            bW = w;
            bH = h;
            bVw = vw;
            bVh = vh;
            bClipTop = clipTop;
            bClipBottom = clipBottom;
            bVisible = visible;
            bOpacity = opacity;
            bMirror = mirror;
            bCleanMode = cleanMode;
            applyLastBounds();
            call.resolve();
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        main.post(() -> {
            if (player != null) {
                if (player.getPlaybackState() == Player.STATE_ENDED) player.seekTo(0);
                player.play();
                emitState();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        main.post(() -> {
            if (player != null) {
                player.pause();
                emitState();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void seek(PluginCall call) {
        double sec = call.getDouble("time", 0.0);
        main.post(() -> {
            if (player != null) {
                player.seekTo(Math.max(0L, Math.round(sec * 1000.0)));
                emitState();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void setRate(PluginCall call) {
        float rate = call.getFloat("rate", 1.0f);
        main.post(() -> {
            if (player != null) {
                player.setPlaybackParameters(new PlaybackParameters(Math.max(0.25f, Math.min(2.0f, rate))));
                emitState();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        float vol = call.getFloat("volume", 1.0f);
        main.post(() -> {
            if (player != null) {
                player.setVolume(Math.max(0f, Math.min(1f, vol)));
                emitState();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        main.post(() -> {
            releaseAll();
            call.resolve();
        });
    }

    private void releaseAll() {
        stopTicker();
        pendingAutoplay = false;
        pendingSeekMs = -1L;
        if (player != null) {
            try {
                player.removeListener(playerListener);
                player.stop();
                player.clearVideoTextureView(textureView);
                player.release();
            } catch (Exception ignored) {
                // ignore
            }
            player = null;
        }
        if (host != null) {
            ViewGroup parent = (ViewGroup) host.getParent();
            if (parent != null) parent.removeView(host);
            host = null;
            textureView = null;
            cleanRestoreBtn = null;
        }
        videoW = 0;
        videoH = 0;
        hostW = 0;
        hostH = 0;
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        main.post(() -> {
            if (player != null && player.isPlaying()) {
                player.pause();
                emitState();
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        main.post(this::releaseAll);
    }
}
