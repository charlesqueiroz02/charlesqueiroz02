package com.calisteniaasiatica.app;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;

/**
 * Casca nativa: carrega o app web de assets/www por um endereço HTTPS virtual
 * (para o localStorage e o Web Audio funcionarem como num navegador) e oferece ao app:
 * voz em português (TextToSpeech), tela acesa durante o treino e o botão voltar.
 */
public class MainActivity extends Activity {

    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/index.html";
    static final int COR_FUNDO = 0xFFF6F1E9;

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsPronto = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT < 35) {
            getWindow().setStatusBarColor(COR_FUNDO);
            getWindow().setNavigationBarColor(COR_FUNDO);
        }

        web = new WebView(this);
        web.setBackgroundColor(COR_FUNDO);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        aplicarBordaABorda();
        registrarVoltar();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Ponte(), "CalisNative");
        web.setWebViewClient(new ClienteLocal());
        web.setWebChromeClient(new WebChromeClient());

        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            public void onInit(int status) {
                ttsPronto = status == TextToSpeech.SUCCESS;
                if (ttsPronto) {
                    try { tts.setLanguage(new Locale("pt", "BR")); } catch (Exception ignored) {}
                }
            }
        });

        web.loadUrl(START_URL);
    }

    // ---------- Serve assets/www ----------
    private class ClienteLocal extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.length() == 0 || path.equals("/")) path = "/index.html";
            if (path.contains("..")) return null;
            try {
                AssetManager am = getAssets();
                InputStream in = am.open("www" + path);
                HashMap<String, String> h = new HashMap<String, String>();
                h.put("Cache-Control", path.startsWith("/assets/") ? "max-age=31536000" : "no-cache");
                return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", h, in);
            } catch (Exception e) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(), null);
            }
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri u = Uri.parse(url);
            if (HOST.equals(u.getHost())) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
            return true;
        }
    }

    static String mime(String path) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(path);
        if (ext == null) return "application/octet-stream";
        ext = ext.toLowerCase(Locale.ROOT);
        if (ext.equals("html")) return "text/html";
        if (ext.equals("js") || ext.equals("mjs")) return "application/javascript";
        if (ext.equals("css")) return "text/css";
        if (ext.equals("svg")) return "image/svg+xml";
        if (ext.equals("json") || ext.equals("webmanifest")) return "application/json";
        String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return m != null ? m : "application/octet-stream";
    }

    // ---------- Ponte JavaScript ----------
    private class Ponte {
        @JavascriptInterface
        public void falar(final String texto) {
            if (!ttsPronto || texto == null) return;
            tts.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "calis");
        }

        @JavascriptInterface
        public void calar() {
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void telaAcesa(final boolean ligar) {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (ligar) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }
    }

    // ---------- Barras do sistema ----------
    private void aplicarBordaABorda() {
        if (Build.VERSION.SDK_INT < 30) return;
        getWindow().setDecorFitsSystemWindows(false);
        web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                android.graphics.Insets i = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            }
        });
    }

    // ---------- Botão voltar: o app web decide; se não houver para onde voltar, minimiza ----------
    private void registrarVoltar() {
        if (Build.VERSION.SDK_INT < 33) return;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                new OnBackInvokedCallback() {
                    public void onBackInvoked() { voltar(); }
                });
    }

    private void voltar() {
        web.evaluateJavascript("(window.__calisVoltar && window.__calisVoltar()) ? 'y' : 'n'", new ValueCallback<String>() {
            public void onReceiveValue(String v) {
                if (v == null || !v.contains("y")) moveTaskToBack(true);
            }
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    @android.annotation.SuppressLint("GestureBackNavigation")
    public void onBackPressed() {
        voltar();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        super.onDestroy();
    }
}
