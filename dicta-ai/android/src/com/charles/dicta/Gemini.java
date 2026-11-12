package com.charles.dicta;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/** Cliente Gemini usado pelo teclado nativo (mesma lógica do app web). */
public class Gemini {

    public static class GeminiException extends Exception {
        public final boolean fatal;
        public GeminiException(String m, boolean fatal) { super(m); this.fatal = fatal; }
    }

    private static final String BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String[] AUTO_MODELS = {
            "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest",
            "gemini-2.5-flash-lite", "gemini-3.5-flash", "gemini-3.1-flash-lite"
    };

    static final String SYSTEM_PROMPT =
            "You are Dicta AI, an expert speech-to-text editor and voice keyboard.\n" +
            "Convert spoken speech into flawless, well formatted written text.\n" +
            "1. Remove fillers, hesitations, repetitions and stuttering (PT: \"humm\", \"tipo assim\", \"né\", \"ééé\", \"então...\", \"aí\", \"sabe?\"; EN: \"um\", \"uh\", \"like\", \"you know\").\n" +
            "2. Resolve self-corrections (\"às duas, não, às três e meia\" -> \"às três e meia\").\n" +
            "3. Respect the user's personal dictionary spelling exactly.\n" +
            "4. Apply the requested style without meta-commentary, never answer questions contained in the speech — only rewrite them.\n" +
            "5. Preserve the author's voice, intent and language.";

    static String modeGuideline(String mode, int formality, int brevity) {
        String f = formality <= 2 ? "casual and conversational" : formality >= 4 ? "formal, executive and polished" : "natural and professional";
        String b = brevity <= 2 ? "expand clearly with full details" : brevity >= 4 ? "ultra-concise, zero fluff" : "balanced length";
        if ("email".equals(mode)) return "Format as an email with greeting, structured paragraphs and polite sign-off. Tone: " + f + ". Length: " + b + ".";
        if ("bullet".equals(mode)) return "Format as structured bullet points / checklist, grouped logically. Length: " + b + ".";
        if ("verbatim".equals(mode)) return "Keep the exact words and structure; only fix spelling, punctuation, capitalization and remove stutters/fillers. Do not paraphrase.";
        if ("social".equals(mode)) return "Format as an engaging social post (LinkedIn/Instagram) with a hook and readable line breaks. Tone: " + f + ".";
        if ("meeting".equals(mode)) return "Format as meeting minutes with sections: Pontos discutidos, Decisões, Próximas ações.";
        if ("summary".equals(mode)) return "Provide an executive TL;DR summary in 1 to 3 punchy sentences.";
        return "Format as a clear, direct chat message (WhatsApp/Telegram). Natural phrasing, emojis only if natural. Tone: " + f + ". Length: " + b + ".";
    }

    /** Configuração sincronizada pelo app (SharedPreferences) */
    public static JSONObject config(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences("dicta", Context.MODE_PRIVATE);
        try { return new JSONObject(p.getString("config", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    private static List<String> modelQueue(Context ctx, String preferred) {
        List<String> q = new ArrayList<String>();
        SharedPreferences p = ctx.getSharedPreferences("dicta", Context.MODE_PRIVATE);
        String last = p.getString("lastGoodModel", null);
        if (preferred != null && preferred.length() > 0 && !"auto".equals(preferred)) q.add(preferred);
        else if (last != null) q.add(last);
        for (String m : AUTO_MODELS) if (!q.contains(m)) q.add(m);
        return q;
    }

    /**
     * Transcreve o áudio e devolve o texto final já polido.
     * contextBefore = texto que já está no campo (ajuda na continuidade).
     */
    public static String transcribe(Context ctx, byte[] audio, String mime, String mode, String contextBefore) throws GeminiException {
        JSONObject cfg = config(ctx);
        String apiKey = cfg.optString("apiKey", "").trim();
        if (apiKey.length() == 0) throw new GeminiException("Abra o app Dicta e configure a chave da IA", true);

        String lang = cfg.optString("language", "pt-BR");
        StringBuilder dict = new StringBuilder();
        JSONArray d = cfg.optJSONArray("dictionary");
        if (d != null) for (int i = 0; i < d.length(); i++) { if (i > 0) dict.append(", "); dict.append(d.optString(i)); }

        StringBuilder prompt = new StringBuilder();
        prompt.append("Transcribe this audio with extreme accuracy, then rewrite it.\n");
        prompt.append("auto".equals(lang) ? "Detect the spoken language automatically.\n" : "The speech is in " + lang + ". Keep this language.\n");
        if (dict.length() > 0) prompt.append("User dictionary (exact spelling): ").append(dict).append(".\n");
        prompt.append("Style: ").append(mode).append(" — ").append(modeGuideline(mode, cfg.optInt("formality", 3), cfg.optInt("brevity", 3))).append("\n");
        String extra = cfg.optString("customInstruction", "");
        if (extra.length() > 0) prompt.append("Extra user instruction: ").append(extra).append("\n");
        if (contextBefore != null && contextBefore.trim().length() > 0) {
            prompt.append("Text already typed in the field (context only, do NOT repeat it): \"\"\"").append(contextBefore).append("\"\"\"\n");
        }
        prompt.append("If the audio has no intelligible speech, return an empty refinedText.\n");
        prompt.append("Respond ONLY with JSON: {\"refinedText\":\"final polished text\"}");

        try {
            JSONObject body = new JSONObject();
            body.put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", SYSTEM_PROMPT))));
            JSONArray parts = new JSONArray();
            parts.put(new JSONObject().put("inlineData", new JSONObject()
                    .put("mimeType", mime)
                    .put("data", android.util.Base64.encodeToString(audio, android.util.Base64.NO_WRAP))));
            parts.put(new JSONObject().put("text", prompt.toString()));
            body.put("contents", new JSONArray().put(new JSONObject().put("role", "user").put("parts", parts)));
            body.put("generationConfig", new JSONObject().put("temperature", 0.3).put("responseMimeType", "application/json"));

            String text = call(ctx, apiKey, cfg.optString("model", "auto"), body.toString());
            try {
                String clean = text.trim();
                if (clean.startsWith("```")) clean = clean.replaceAll("^```(json)?", "").replaceAll("```$", "").trim();
                return new JSONObject(clean).optString("refinedText", "").trim();
            } catch (Exception e) {
                return text.trim();
            }
        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Erro ao preparar o áudio", false);
        }
    }

    private static String call(Context ctx, String apiKey, String preferred, String body) throws GeminiException {
        GeminiException last = null;
        for (String model : modelQueue(ctx, preferred)) {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(BASE + model + ":generateContent").openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(90000);
                c.setRequestMethod("POST");
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                c.setRequestProperty("x-goog-api-key", apiKey);
                OutputStream os = c.getOutputStream();
                os.write(body.getBytes("UTF-8"));
                os.close();

                int code = c.getResponseCode();
                String resp = read(code >= 400 ? c.getErrorStream() : c.getInputStream());
                if (code == 200) {
                    JSONObject j = new JSONObject(resp);
                    JSONArray cands = j.optJSONArray("candidates");
                    if (cands == null || cands.length() == 0) { last = new GeminiException("A IA não retornou texto", false); continue; }
                    JSONArray ps = cands.getJSONObject(0).optJSONObject("content") != null
                            ? cands.getJSONObject(0).getJSONObject("content").optJSONArray("parts") : null;
                    StringBuilder sb = new StringBuilder();
                    if (ps != null) for (int i = 0; i < ps.length(); i++) sb.append(ps.getJSONObject(i).optString("text", ""));
                    ctx.getSharedPreferences("dicta", Context.MODE_PRIVATE).edit().putString("lastGoodModel", model).apply();
                    return sb.toString();
                }
                String msg = "HTTP " + code;
                try { msg = new JSONObject(resp).getJSONObject("error").optString("message", msg); } catch (Exception ignored) {}
                if (code == 400 && msg.toLowerCase().contains("api key")) throw new GeminiException("Chave da IA inválida — confira no app Dicta", true);
                if (code == 403) throw new GeminiException("Chave sem permissão — gere outra no AI Studio", true);
                if (code == 429) last = new GeminiException("Limite gratuito atingido — aguarde 1 min", false);
                else if (code >= 500) last = new GeminiException("IA ocupada — tente de novo", false);
                else last = new GeminiException(msg, false);
            } catch (GeminiException e) {
                throw e;
            } catch (java.net.UnknownHostException e) {
                throw new GeminiException("Sem internet", false);
            } catch (java.net.SocketTimeoutException e) {
                last = new GeminiException("A IA demorou demais", false);
            } catch (Exception e) {
                last = new GeminiException("Falha de conexão", false);
            } finally {
                if (c != null) c.disconnect();
            }
        }
        throw last != null ? last : new GeminiException("Nenhum modelo disponível", false);
    }

    private static String read(InputStream in) throws java.io.IOException {
        if (in == null) return "";
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        in.close();
        return bo.toString("UTF-8");
    }
}
