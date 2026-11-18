package com.dictaai.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;

public class MainActivity extends Activity {

    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/index.html";
    /** Mesmo valor de android:authorities do ShareProvider no AndroidManifest.xml */
    static final String SHARE_AUTHORITY = "com.dictaai.app.share";
    private static final int REQ_MIC = 11;
    private static final int REQ_FILE = 12;

    private WebView web;
    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> fileCallback;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        if (Build.VERSION.SDK_INT < 35) {
            // A partir do Android 15 a tela é sempre de ponta a ponta e essas cores são ignoradas
            getWindow().setStatusBarColor(0xFF090A0F);
            getWindow().setNavigationBarColor(0xFF090A0F);
        }

        web = new WebView(this);
        web.setBackgroundColor(0xFF090A0F);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        applyEdgeToEdge();
        registerBackHandler();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " DictaAndroid");

        web.addJavascriptInterface(new Bridge(), "DictaNative");
        web.setWebViewClient(new LocalClient());
        web.setWebChromeClient(new Chrome());

        String extra = "";
        Intent it = getIntent();
        if (it != null && it.getStringExtra("tab") != null) extra = "?tab=" + it.getStringExtra("tab");
        web.loadUrl(START_URL + extra);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && "keyboard".equals(intent.getStringExtra("tab"))) {
            web.evaluateJavascript("location.href='" + START_URL + "?tab=keyboard'", null);
        }
    }

    // ---------- Servir os arquivos do app a partir de assets/www via HTTPS virtual ----------
    private class LocalClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.equals("/") || path.length() == 0) path = "/index.html";
            if (path.contains("..")) return null;
            try {
                AssetManager am = getAssets();
                InputStream in = am.open("www" + path);
                String ext = MimeTypeMap.getFileExtensionFromUrl(path);
                String mime = guessMime(ext);
                HashMap<String, String> h = new HashMap<String, String>();
                h.put("Cache-Control", path.startsWith("/assets/") ? "max-age=31536000" : "no-cache");
                h.put("Access-Control-Allow-Origin", "*");
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", h, in);
            } catch (Exception e) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(), null);
            }
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri u = Uri.parse(url);
            if (HOST.equals(u.getHost())) return false;
            openExternal(url);
            return true;
        }
    }

    static String guessMime(String ext) {
        if (ext == null) return "application/octet-stream";
        ext = ext.toLowerCase(Locale.ROOT);
        if (ext.equals("html")) return "text/html";
        if (ext.equals("js") || ext.equals("mjs")) return "application/javascript";
        if (ext.equals("css")) return "text/css";
        if (ext.equals("svg")) return "image/svg+xml";
        if (ext.equals("json") || ext.equals("webmanifest")) return "application/json";
        if (ext.equals("wasm")) return "application/wasm";
        String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return m != null ? m : "application/octet-stream";
    }

    // ---------- Permissões de microfone e seleção de arquivos ----------
    private class Chrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(new Runnable() {
                public void run() {
                    boolean wantsAudio = false;
                    for (String r : request.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsAudio = true;
                    if (!wantsAudio) { request.deny(); return; }
                    if (hasMic()) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pendingWebPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    }
                }
            });
        }

        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = cb;
            try {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                String[] types = params.getAcceptTypes();
                String t = (types != null && types.length > 0 && types[0].length() > 0) ? types[0] : "*/*";
                if (t.startsWith(".")) t = "*/*";
                if (t.contains("audio")) t = "audio/*";
                if (t.contains("json")) t = "*/*";
                i.setType(t);
                startActivityForResult(Intent.createChooser(i, "Escolher arquivo"), REQ_FILE);
                return true;
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
        }
    }

    boolean hasMic() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == REQ_MIC) {
            boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingWebPermission != null) {
                if (ok) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                else pendingWebPermission.deny();
                pendingWebPermission = null;
            }
            if (!ok && !shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO)) {
                Toast.makeText(this, "Libere o microfone em Permissões do app", Toast.LENGTH_LONG).show();
            }
            notifyResume();
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE && fileCallback != null) {
            Uri[] out = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    ClipData cd = data.getClipData();
                    out = new Uri[cd.getItemCount()];
                    for (int i = 0; i < cd.getItemCount(); i++) out[i] = cd.getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    out = new Uri[]{data.getData()};
                }
            }
            fileCallback.onReceiveValue(out);
            fileCallback = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    protected void onResume() {
        super.onResume();
        notifyResume();
    }

    private void notifyResume() {
        if (web != null) web.evaluateJavascript("window.__dictaOnResume && window.__dictaOnResume()", null);
    }

    /**
     * Android 15+ (targetSdk 35/36) desenha o app atrás das barras do sistema e do teclado.
     * Aplicamos as margens no WebView para nada ficar escondido. No Android 11–14 ativamos o
     * mesmo modo para o comportamento ser igual; abaixo disso vale o adjustResize do manifest.
     */
    private void applyEdgeToEdge() {
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

    /**
     * Botão/gesto voltar: o app web fecha modais e volta de aba; se não houver nada a
     * fechar, o app vai para segundo plano. No Android 13+ usa a API nova (no targetSdk 36
     * o onBackPressed deixa de ser chamado); abaixo disso, onBackPressed.
     */
    private void registerBackHandler() {
        if (Build.VERSION.SDK_INT < 33) return;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                new OnBackInvokedCallback() {
                    public void onBackInvoked() { handleBack(); }
                });
    }

    private void handleBack() {
        web.evaluateJavascript("(window.__dictaOnBack && window.__dictaOnBack()) ? 'y' : 'n'", new ValueCallback<String>() {
            public void onReceiveValue(String v) {
                if (v == null || !v.contains("y")) moveTaskToBack(true);
            }
        });
    }

    /** Só é chamado no Android 12 ou anterior; do 13 em diante quem trata é registerBackHandler(). */
    @Override
    @SuppressWarnings("deprecation")
    @android.annotation.SuppressLint("GestureBackNavigation")
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        super.onDestroy();
    }

    void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "Não foi possível abrir o link", Toast.LENGTH_SHORT).show();
        }
    }

    static boolean imeEnabled(Context c) {
        String list = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.ENABLED_INPUT_METHODS);
        String me = new ComponentName(c, DictaKeyboardService.class).flattenToShortString();
        String meLong = new ComponentName(c, DictaKeyboardService.class).flattenToString();
        return list != null && (list.contains(me) || list.contains(meLong));
    }

    static boolean imeSelected(Context c) {
        String cur = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.DEFAULT_INPUT_METHOD);
        if (cur == null) return false;
        ComponentName cn = ComponentName.unflattenFromString(cur);
        return cn != null && cn.getPackageName().equals(c.getPackageName());
    }

    // ---------- Ponte JavaScript ----------
    private class Bridge {
        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("Dicta", text));
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(i, "Compartilhar texto"));
                }
            });
        }

        @JavascriptInterface
        public void shareFile(String base64, String filename, final String mime) {
            try {
                String safe = filename.replaceAll("[^A-Za-z0-9._-]", "_");
                File dir = new File(getCacheDir(), "share");
                dir.mkdirs();
                File f = new File(dir, safe);
                FileOutputStream fo = new FileOutputStream(f);
                fo.write(Base64.decode(base64, Base64.DEFAULT));
                fo.close();
                final Uri uri = Uri.parse("content://" + SHARE_AUTHORITY + "/" + safe);
                runOnUiThread(new Runnable() {
                    public void run() {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType(mime);
                        i.putExtra(Intent.EXTRA_STREAM, uri);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        Intent ch = Intent.createChooser(i, "Salvar ou enviar arquivo");
                        ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(ch);
                    }
                });
            } catch (Exception e) {
                toast("Falha ao gerar arquivo");
            }
        }

        @JavascriptInterface
        public void setConfig(String json) {
            try {
                new JSONObject(json);
                getSharedPreferences("dicta", MODE_PRIVATE).edit().putString("config", json).apply();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void speak(final String text, final String lang) {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (tts == null) {
                        tts = new TextToSpeech(MainActivity.this, new TextToSpeech.OnInitListener() {
                            public void onInit(int status) {
                                ttsReady = status == TextToSpeech.SUCCESS;
                                if (ttsReady) doSpeak(text, lang);
                            }
                        });
                    } else if (ttsReady) {
                        doSpeak(text, lang);
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null) v.vibrate(Math.max(5, Math.min(ms, 200)));
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openKeyboardSettings() {
            runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        startActivity(new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS));
                        toast("Ative \"Dicta AI – Teclado de Voz\" e volte ao app");
                    } catch (Exception e) {
                        toast("Abra Configurações › Teclados");
                    }
                }
            });
        }

        @JavascriptInterface
        public void showKeyboardPicker() {
            runOnUiThread(new Runnable() {
                public void run() {
                    InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                    imm.showInputMethodPicker();
                }
            });
        }

        @JavascriptInterface
        public String getKeyboardStatus() {
            try {
                return new JSONObject()
                        .put("enabled", imeEnabled(MainActivity.this))
                        .put("selected", imeSelected(MainActivity.this))
                        .put("mic", hasMic()).toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void requestMicPermission() {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (hasMic()) { notifyResume(); return; }
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                }
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(new Runnable() { public void run() { openExternal(url); } });
        }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                    startActivity(i);
                }
            });
        }

        @JavascriptInterface
        public String getVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }
    }

    private void doSpeak(String text, String lang) {
        try { tts.setLanguage(Locale.forLanguageTag(lang)); } catch (Exception ignored) {}
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "dicta");
    }

    private void toast(final String m) {
        runOnUiThread(new Runnable() {
            public void run() { Toast.makeText(MainActivity.this, m, Toast.LENGTH_LONG).show(); }
        });
    }
}
