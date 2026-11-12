package com.charles.dicta;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.inputmethodservice.InputMethodService;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.media.ToneGenerator;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputMethodManager;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;

/**
 * Teclado de sistema Dicta: toque no microfone, fale, e o texto polido pela IA
 * é digitado direto no app aberto (WhatsApp, Gmail, Teams...).
 */
public class DictaKeyboardService extends InputMethodService {

    private static final String[][] MODES = {
            {"auto", "✨ Auto"}, {"casual", "Chat"}, {"email", "E-mail"}, {"bullet", "Tópicos"},
            {"meeting", "Ata"}, {"verbatim", "Literal"}, {"social", "LinkedIn"}, {"summary", "Resumo"}
    };
    private static final int C_BG = 0xFF0E0F16, C_KEY = 0xFF1C1E2B, C_KEY_PRESSED = 0xFF2A2D40,
            C_TEXT = 0xFFE4E4E7, C_MUTED = 0xFF8B8BA0, C_ACCENT = 0xFF8B5CF6, C_REC = 0xFFF43F5E;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private LinearLayout chipRow;
    private TextView status, micBtn, undoBtn;
    private MediaRecorder recorder;
    private File audioFile;
    private boolean recording = false, processing = false;
    private long recStart;
    private String mode = "auto";
    private String lastInserted = null;
    private String currentPackage = "";
    private ToneGenerator tone;

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private GradientDrawable round(int color, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radius));
        return g;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mode = getSharedPreferences("dicta", MODE_PRIVATE).getString("imeMode", "auto");
        try { tone = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 35); } catch (Exception ignored) {}
    }

    @Override
    public View onCreateInputView() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(C_BG);
        root.setPadding(dp(8), dp(6), dp(8), dp(8));

        // Linha 1: estilos
        HorizontalScrollView hs = new HorizontalScrollView(this);
        hs.setHorizontalScrollBarEnabled(false);
        chipRow = new LinearLayout(this);
        chipRow.setOrientation(LinearLayout.HORIZONTAL);
        hs.addView(chipRow);
        root.addView(hs, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(36)));
        buildChips();

        // Linha 2: status
        status = new TextView(this);
        status.setTextColor(C_MUTED);
        status.setTextSize(13);
        status.setGravity(Gravity.CENTER);
        status.setMaxLines(2);
        LinearLayout.LayoutParams stp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40));
        root.addView(status, stp);

        // Linha 3: [desfazer] [MIC] [apagar]
        LinearLayout mid = new LinearLayout(this);
        mid.setOrientation(LinearLayout.HORIZONTAL);
        mid.setGravity(Gravity.CENTER_VERTICAL);

        undoBtn = key("↶ Desfazer", 13);
        undoBtn.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { undo(); } });
        mid.addView(undoBtn, new LinearLayout.LayoutParams(0, dp(48), 1f));

        FrameLayout micWrap = new FrameLayout(this);
        micBtn = new TextView(this);
        micBtn.setGravity(Gravity.CENTER);
        micBtn.setTextColor(Color.WHITE);
        micBtn.setTextSize(30);
        micBtn.setText("🎙");
        micBtn.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { toggleMic(); } });
        FrameLayout.LayoutParams mp = new FrameLayout.LayoutParams(dp(84), dp(84), Gravity.CENTER);
        micWrap.addView(micBtn, mp);
        mid.addView(micWrap, new LinearLayout.LayoutParams(0, dp(96), 1.2f));

        TextView del = key("⌫", 22);
        setupRepeatDelete(del);
        mid.addView(del, new LinearLayout.LayoutParams(0, dp(48), 1f));
        root.addView(mid);

        // Linha 4: [🌐] [,] [espaço] [.] [↵]
        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        bottom.setPadding(0, dp(6), 0, 0);
        TextView globe = key("🌐", 18);
        globe.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { switchKeyboard(); } });
        globe.setOnLongClickListener(new View.OnLongClickListener() {
            public boolean onLongClick(View v) {
                ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE)).showInputMethodPicker();
                return true;
            }
        });
        bottom.addView(globe, keyLp(1f));
        bottom.addView(charKey(","), keyLp(0.8f));
        TextView space = key("espaço", 14);
        space.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { commit(" ", false); } });
        bottom.addView(space, keyLp(3.4f));
        bottom.addView(charKey("."), keyLp(0.8f));
        bottom.addView(charKey("?"), keyLp(0.8f));
        TextView enter = key("↵", 20);
        enter.setBackground(round(C_ACCENT, 12));
        enter.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { enter(); } });
        bottom.addView(enter, keyLp(1.2f));
        root.addView(bottom);

        refreshMic();
        return root;
    }

    private LinearLayout.LayoutParams keyLp(float w) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(46), w);
        lp.setMargins(dp(3), 0, dp(3), 0);
        return lp;
    }

    private TextView key(String label, int size) {
        final TextView t = new TextView(this);
        t.setText(label);
        t.setTextColor(C_TEXT);
        t.setTextSize(size);
        t.setGravity(Gravity.CENTER);
        t.setBackground(round(C_KEY, 12));
        t.setOnTouchListener(new View.OnTouchListener() {
            public boolean onTouch(View v, MotionEvent e) {
                if (e.getAction() == MotionEvent.ACTION_DOWN) { v.setAlpha(0.6f); haptic(8); }
                else if (e.getAction() == MotionEvent.ACTION_UP || e.getAction() == MotionEvent.ACTION_CANCEL) v.setAlpha(1f);
                return false;
            }
        });
        return t;
    }

    private TextView charKey(final String ch) {
        TextView t = key(ch, 20);
        t.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { commit(ch, false); } });
        return t;
    }

    private void buildChips() {
        chipRow.removeAllViews();
        for (final String[] m : MODES) {
            TextView c = new TextView(this);
            c.setText(m[1]);
            c.setTextSize(12.5f);
            c.setTypeface(Typeface.DEFAULT_BOLD);
            c.setGravity(Gravity.CENTER);
            c.setPadding(dp(14), 0, dp(14), 0);
            boolean sel = m[0].equals(mode);
            c.setTextColor(sel ? Color.WHITE : C_MUTED);
            c.setBackground(round(sel ? C_ACCENT : C_KEY, 18));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(32));
            lp.setMargins(0, 0, dp(6), 0);
            c.setOnClickListener(new View.OnClickListener() {
                public void onClick(View v) {
                    mode = m[0];
                    getSharedPreferences("dicta", MODE_PRIVATE).edit().putString("imeMode", mode).apply();
                    buildChips();
                    setIdleStatus();
                }
            });
            chipRow.addView(c, lp);
        }
    }

    /** Estilo automático conforme o app em uso */
    private String resolveMode() {
        if (!"auto".equals(mode)) return mode;
        String p = currentPackage == null ? "" : currentPackage.toLowerCase();
        if (p.equals("com.google.android.gm") || p.contains("outlook") || p.contains("mail")) return "email";
        if (p.contains("linkedin")) return "social";
        if (p.contains("keep") || p.contains("notes") || p.contains("notion") || p.contains("todo") || p.contains("tasks")) return "bullet";
        if (p.contains("docs") || p.contains("word")) return "verbatim";
        return "casual";
    }

    private String modeLabel(String id) {
        for (String[] m : MODES) if (m[0].equals(id)) return m[1];
        return id;
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        currentPackage = info != null && info.packageName != null ? info.packageName : "";
        if (!restarting) lastInserted = null;
        refreshMic();
        if (!recording && !processing) setIdleStatus();
    }

    @Override
    public void onFinishInputView(boolean finishingInput) {
        if (recording) cancelRecording();
        super.onFinishInputView(finishingInput);
    }

    private void setIdleStatus() {
        if (status == null) return;
        JSONObject cfg = Gemini.config(this);
        if (cfg.optString("apiKey", "").length() == 0) {
            setStatus("Toque aqui para abrir o Dicta e configurar a chave da IA", C_REC, true);
        } else if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            setStatus("Toque aqui para liberar o microfone no app Dicta", C_REC, true);
        } else {
            String m = resolveMode();
            setStatus("Toque no microfone e fale • estilo: " + modeLabel(m).replace("✨ ", ""), C_MUTED, false);
        }
    }

    private void setStatus(String s, int color, boolean opensApp) {
        status.setText(s);
        status.setTextColor(color);
        if (opensApp) {
            status.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { openApp(); } });
        } else {
            status.setOnClickListener(null);
            status.setClickable(false);
        }
    }

    private void openApp() {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.putExtra("tab", "keyboard");
        startActivity(i);
    }

    private void refreshMic() {
        if (micBtn == null) return;
        int color = recording ? C_REC : processing ? C_KEY_PRESSED : C_ACCENT;
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                recording ? new int[]{0xFFE11D48, 0xFFF59E0B} : processing ? new int[]{color, color} : new int[]{0xFF7C3AED, 0xFF4F46E5});
        g.setShape(GradientDrawable.OVAL);
        if (recording) g.setStroke(dp(5), 0x55F43F5E);
        micBtn.setBackground(g);
        micBtn.setText(recording ? "■" : processing ? "…" : "🎙");
        micBtn.setTextSize(recording ? 26 : 30);
        micBtn.setScaleX(1f);
        micBtn.setScaleY(1f);
        if (undoBtn != null) undoBtn.setAlpha(lastInserted != null ? 1f : 0.35f);
    }

    // ---------- Gravação ----------
    private void toggleMic() {
        if (processing) return;
        if (recording) { stopAndProcess(); return; }
        JSONObject cfg = Gemini.config(this);
        if (cfg.optString("apiKey", "").length() == 0) { openApp(); return; }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { openApp(); return; }
        startRecording();
    }

    private void startRecording() {
        try {
            audioFile = new File(getCacheDir(), "ime_rec.aac");
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioChannels(1);
            recorder.setAudioSamplingRate(16000);
            recorder.setAudioEncodingBitRate(32000);
            recorder.setOutputFile(audioFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            recording = true;
            recStart = System.currentTimeMillis();
            beep(true);
            haptic(25);
            refreshMic();
            ui.post(levelLoop);
        } catch (Exception e) {
            releaseRecorder();
            setStatus("Microfone ocupado ou indisponível", C_REC, false);
        }
    }

    private final Runnable levelLoop = new Runnable() {
        public void run() {
            if (!recording || recorder == null) return;
            long secs = (System.currentTimeMillis() - recStart) / 1000;
            setStatus(String.format("Ouvindo… %d:%02d  • toque ■ para finalizar", secs / 60, secs % 60), 0xFFF9A8D4, false);
            try {
                float amp = Math.min(1f, recorder.getMaxAmplitude() / 12000f);
                float s = 1f + amp * 0.18f;
                micBtn.setScaleX(s);
                micBtn.setScaleY(s);
            } catch (Exception ignored) {}
            if (secs >= 300) { stopAndProcess(); return; }
            ui.postDelayed(this, 90);
        }
    };

    private void cancelRecording() {
        recording = false;
        releaseRecorder();
        refreshMic();
    }

    private void releaseRecorder() {
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            try { recorder.release(); } catch (Exception ignored) {}
            recorder = null;
        }
    }

    private void stopAndProcess() {
        long dur = System.currentTimeMillis() - recStart;
        recording = false;
        releaseRecorder();
        beep(false);
        haptic(20);
        if (dur < 800 || audioFile == null || audioFile.length() < 1000) {
            refreshMic();
            setStatus("Muito curto — segure o assunto por mais tempo", C_REC, false);
            return;
        }
        processing = true;
        refreshMic();
        setStatus("✨ IA refinando seu texto…", 0xFFC4B5FD, false);

        final String m = resolveMode();
        final String before = textBefore(600);
        new Thread(new Runnable() {
            public void run() {
                try {
                    byte[] data = readFile(audioFile);
                    final String text = Gemini.transcribe(DictaKeyboardService.this, data, "audio/aac", m, before);
                    ui.post(new Runnable() {
                        public void run() {
                            processing = false;
                            if (text.length() == 0) {
                                setStatus("Não entendi nenhuma fala. Tente de novo.", C_REC, false);
                            } else {
                                commit(text, true);
                                haptic(15);
                                setStatus("✓ Inserido • " + modeLabel(m).replace("✨ ", "") + " — ↶ para desfazer", 0xFF6EE7B7, false);
                            }
                            refreshMic();
                        }
                    });
                } catch (final Gemini.GeminiException e) {
                    ui.post(new Runnable() {
                        public void run() {
                            processing = false;
                            setStatus(e.getMessage(), C_REC, e.fatal);
                            refreshMic();
                        }
                    });
                } catch (final Exception e) {
                    ui.post(new Runnable() {
                        public void run() {
                            processing = false;
                            setStatus("Erro inesperado: " + e.getClass().getSimpleName(), C_REC, false);
                            refreshMic();
                        }
                    });
                }
            }
        }).start();
    }

    private static byte[] readFile(File f) throws java.io.IOException {
        byte[] b = new byte[(int) f.length()];
        FileInputStream in = new FileInputStream(f);
        int off = 0, n;
        while (off < b.length && (n = in.read(b, off, b.length - off)) > 0) off += n;
        in.close();
        return b;
    }

    // ---------- Edição ----------
    private String textBefore(int n) {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return "";
        CharSequence cs = ic.getTextBeforeCursor(n, 0);
        return cs == null ? "" : cs.toString();
    }

    private void commit(String text, boolean smartSpace) {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        String out = text;
        if (smartSpace) {
            String b = textBefore(1);
            if (b.length() > 0 && !Character.isWhitespace(b.charAt(0))) out = " " + out;
            lastInserted = out;
        }
        ic.commitText(out, 1);
        if (!smartSpace) lastInserted = null;
        refreshMic();
    }

    private void undo() {
        if (lastInserted == null) return;
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        String b = textBefore(lastInserted.length());
        if (b.equals(lastInserted)) {
            ic.deleteSurroundingText(lastInserted.length(), 0);
            setStatus("Texto desfeito", C_MUTED, false);
        }
        lastInserted = null;
        refreshMic();
    }

    private void deleteOne() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        CharSequence sel = ic.getSelectedText(0);
        if (sel != null && sel.length() > 0) ic.commitText("", 1);
        else {
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DEL));
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DEL));
        }
        lastInserted = null;
    }

    private void setupRepeatDelete(final TextView del) {
        final Runnable[] repeat = new Runnable[1];
        repeat[0] = new Runnable() {
            public void run() {
                deleteOne();
                ui.postDelayed(repeat[0], 55);
            }
        };
        del.setOnTouchListener(new View.OnTouchListener() {
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        v.setAlpha(0.6f);
                        haptic(8);
                        deleteOne();
                        ui.postDelayed(repeat[0], 420);
                        return true;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        v.setAlpha(1f);
                        ui.removeCallbacks(repeat[0]);
                        refreshMic();
                        return true;
                }
                return false;
            }
        });
    }

    private void enter() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        EditorInfo ei = getCurrentInputEditorInfo();
        int action = ei != null ? (ei.imeOptions & EditorInfo.IME_MASK_ACTION) : EditorInfo.IME_ACTION_NONE;
        boolean noEnterAction = ei != null && (ei.imeOptions & EditorInfo.IME_FLAG_NO_ENTER_ACTION) != 0;
        boolean multiLine = ei != null && (ei.inputType & EditorInfo.TYPE_TEXT_FLAG_MULTI_LINE) != 0;
        if (!noEnterAction && !multiLine && action != EditorInfo.IME_ACTION_NONE && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            ic.performEditorAction(action);
        } else {
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER));
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER));
        }
        lastInserted = null;
        refreshMic();
    }

    private void switchKeyboard() {
        boolean ok = false;
        InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        try {
            android.os.IBinder token = getWindow().getWindow().getAttributes().token;
            ok = imm.switchToNextInputMethod(token, false);
        } catch (Exception ignored) {}
        if (!ok) imm.showInputMethodPicker();
    }

    // ---------- Feedback ----------
    private boolean soundsOn() {
        return Gemini.config(this).optBoolean("sounds", true);
    }

    private void beep(boolean start) {
        if (tone == null || !soundsOn()) return;
        try { tone.startTone(start ? ToneGenerator.TONE_PROP_BEEP : ToneGenerator.TONE_PROP_ACK, 90); } catch (Exception ignored) {}
    }

    private void haptic(int ms) {
        if (!soundsOn()) return;
        try {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v != null) v.vibrate(ms);
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        releaseRecorder();
        if (tone != null) tone.release();
        super.onDestroy();
    }
}
