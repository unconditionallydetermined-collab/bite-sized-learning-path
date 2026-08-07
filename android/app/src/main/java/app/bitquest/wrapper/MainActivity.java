package app.bitquest.wrapper;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Thin native wrapper around the BitQuest web app. The website itself is
 * unchanged; this simply hosts it in a full-screen WebView so the app can be
 * installed from an APK, long-pressed for the "Start a lesson" shortcut, and
 * fed stats to the home-screen streak widget.
 */
public class MainActivity extends Activity {

    private static final String BASE_URL = "https://bite-sized-learning-path.lovable.app";
    /** Always-valid entry point: the site routes this straight into a lesson. */
    private static final String QUICK_LESSON = "/?start=lesson";
    public static final String EXTRA_QUICK_LESSON = "app.bitquest.wrapper.QUICK_LESSON";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new StatsBridge(this), "BitQuestNative");

        webView.loadUrl(BASE_URL + startPath(getIntent()));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (webView != null) {
            webView.loadUrl(BASE_URL + startPath(intent));
        }
    }

    /** The "Start a lesson" shortcut and widget both open the lesson launcher. */
    private String startPath(Intent intent) {
        if (intent == null) return "/";
        if (intent.getBooleanExtra(EXTRA_QUICK_LESSON, false)) return QUICK_LESSON;
        Uri data = intent.getData();
        if (data != null && "bitquest".equals(data.getScheme())) return QUICK_LESSON;
        return "/";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** Lets the web app publish streak/gem numbers to the home-screen widget. */
    public static class StatsBridge {
        private final Activity activity;

        StatsBridge(Activity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void setStats(int streak, int gems) {
            StreakWidget.saveStats(activity, streak, gems);
        }
    }
}
