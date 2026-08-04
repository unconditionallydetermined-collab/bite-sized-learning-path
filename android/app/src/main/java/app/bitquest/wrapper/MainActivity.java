package app.bitquest.wrapper;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Thin native wrapper around the BitQuest web app. The website itself is
 * unchanged; this simply hosts it in a full-screen WebView so the app can be
 * installed from an APK and long-pressed for the "Start a lesson" shortcut.
 */
public class MainActivity extends Activity {

    private static final String BASE_URL = "https://bite-sized-learning-path.lovable.app";

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

    /** The "Start a lesson" shortcut skips the home screen and opens /start. */
    private String startPath(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        if (data != null && "bitquest".equals(data.getScheme())) {
            return "/start";
        }
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
}
