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
    /**
     * Mesmos limites do app web (gemini.ts): no máximo 3 modelos que respondam de fato
     * (modelo inexistente não conta), 45 s cada, 120 s no total.
     */
    private static final int MAX_ATTEMPTS = 3;
    private static final int PER_MODEL_TIMEOUT_MS = 45000;
    private static final long TOTAL_BUDGET_MS = 120000;
    private static final long MAX_RETRY_WAIT_MS = 10000;
    /**
     * Flash-Lite primeiro (mais barato). Os modelos 2.5 deixaram de ser liberados para
     * chaves novas ("no longer available to new users") e saíram da lista.
     * Mesma lista de app/src/lib/gemini.ts — mude as duas juntas.
     */
    private static final String[] AUTO_MODELS = {
            "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-flash-latest"
    };
    private static final java.util.regex.Pattern UNAVAILABLE = java.util.regex.Pattern.compile(
            "no longer available|not found|not supported|unsupported|deprecated|is not available|does not exist|retired",
            java.util.regex.Pattern.CASE_INSENSITIVE);

    /** Modelos antigos (1.x/2.x) que o Google não libera mais para chaves novas */
    static boolean isRetired(String id) {
        return id == null || id.startsWith("gemini-1.") || id.startsWith("gemini-2.");
    }

    static boolean isModelUnavailable(int code, String msg) {
        if (code == 404) return true;
        if (code != 400 && code != 403) return false;
        String m = msg == null ? "" : msg.toLowerCase();
        if (m.contains("api key") && !m.contains("model")) return false;
        return UNAVAILABLE.matcher(m).find();
    }

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

    private static String keyTag(String apiKey) {
        return String.valueOf(apiKey.hashCode());
    }

    private static List<String> unavailable(SharedPreferences p, String apiKey) {
        List<String> out = new ArrayList<String>();
        if (!keyTag(apiKey).equals(p.getString("unavailableKey", ""))) return out;
        for (String m : p.getString("unavailableModels", "").split(",")) if (m.length() > 0) out.add(m);
        return out;
    }

    private static void markUnavailable(SharedPreferences p, String apiKey, String model) {
        List<String> list = unavailable(p, apiKey);
        if (!list.contains(model)) list.add(model);
        StringBuilder sb = new StringBuilder();
        for (String m : list) { if (sb.length() > 0) sb.append(','); sb.append(m); }
        p.edit().putString("unavailableKey", keyTag(apiKey)).putString("unavailableModels", sb.toString()).apply();
    }

    private static List<String> modelQueue(Context ctx, String preferred, String apiKey) {
        List<String> q = new ArrayList<String>();
        SharedPreferences p = ctx.getSharedPreferences("dicta", Context.MODE_PRIVATE);
        String last = p.getString("lastGoodModel", null);
        if (isRetired(last)) last = null;
        // Preferência antiga (ex.: gemini-2.5-flash) é tratada como "auto"
        if (preferred != null && preferred.length() > 0 && !"auto".equals(preferred) && !isRetired(preferred)) q.add(preferred);
        else if (last != null) q.add(last);
        for (String m : AUTO_MODELS) if (!q.contains(m)) q.add(m);
        List<String> skip = unavailable(p, apiKey);
        List<String> usable = new ArrayList<String>();
        for (String m : q) if (!skip.contains(m)) usable.add(m);
        // Se tudo ficou marcado indisponível, tenta a lista inteira de novo
        return usable.isEmpty() ? q : usable;
    }

    private static long retryDelayMs(String resp) {
        try {
            JSONArray det = new JSONObject(resp).getJSONObject("error").optJSONArray("details");
            if (det == null) return -1;
            for (int i = 0; i < det.length(); i++) {
                String rd = det.getJSONObject(i).optString("retryDelay", "");
                if (rd.endsWith("s")) return (long) Math.ceil(Double.parseDouble(rd.substring(0, rd.length() - 1)) * 1000);
            }
        } catch (Exception ignored) {}
        return -1;
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

    /** Prioridade do erro mostrado no fim: o mais útil para o usuário vence */
    private static final int P_UNAVAILABLE = 1, P_EMPTY = 2, P_BUSY = 3, P_TIMEOUT = 4, P_UNKNOWN = 4, P_LIMIT = 5;

    private static String call(Context ctx, String apiKey, String preferred, String body) throws GeminiException {
        GeminiException best = null;
        int bestRank = 0;
        long deadline = System.currentTimeMillis() + TOTAL_BUDGET_MS;
        SharedPreferences prefs = ctx.getSharedPreferences("dicta", Context.MODE_PRIVATE);
        int attempts = 0;
        for (String model : modelQueue(ctx, preferred, apiKey)) {
            if (attempts >= MAX_ATTEMPTS) break;
            boolean retried429 = false;
            while (true) {
                long remaining = deadline - System.currentTimeMillis();
                if (remaining <= 0) break;
                HttpURLConnection c = null;
                GeminiException err = null;
                int rank = 0;
                boolean retrySame = false;
                try {
                    c = (HttpURLConnection) new URL(BASE + model + ":generateContent").openConnection();
                    c.setConnectTimeout((int) Math.min(15000, remaining));
                    c.setReadTimeout((int) Math.min(PER_MODEL_TIMEOUT_MS, remaining));
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
                        attempts++;
                        JSONObject j = new JSONObject(resp);
                        JSONArray cands = j.optJSONArray("candidates");
                        JSONArray ps = (cands != null && cands.length() > 0 && cands.getJSONObject(0).optJSONObject("content") != null)
                                ? cands.getJSONObject(0).getJSONObject("content").optJSONArray("parts") : null;
                        StringBuilder sb = new StringBuilder();
                        if (ps != null) for (int i = 0; i < ps.length(); i++) sb.append(ps.getJSONObject(i).optString("text", ""));
                        if (sb.toString().trim().length() == 0) {
                            err = new GeminiException("A IA não retornou texto. Tente de novo.", false);
                            rank = P_EMPTY;
                        } else {
                            prefs.edit().putString("lastGoodModel", model).apply();
                            return sb.toString();
                        }
                    } else {
                        String msg = "HTTP " + code;
                        try { msg = new JSONObject(resp).getJSONObject("error").optString("message", msg); } catch (Exception ignored) {}
                        if (isModelUnavailable(code, msg)) {
                            // não conta como tentativa: o modelo não existe para esta chave
                            android.util.Log.w("Dicta", "Modelo " + model + " indisponível: " + msg);
                            markUnavailable(prefs, apiKey, model);
                            err = new GeminiException("Nenhum modelo de IA disponível — abra o Dicta › Preferências › Modelo: Automático", false);
                            rank = P_UNAVAILABLE;
                        } else {
                            attempts++;
                            if (code == 400 && msg.toLowerCase().contains("api key")) throw new GeminiException("Chave da IA inválida — confira no app Dicta", true);
                            if (code == 401 || code == 403) throw new GeminiException("Chave sem permissão — gere outra no AI Studio", true);
                            if (code == 429) {
                                long wait = retryDelayMs(resp);
                                if (!retried429 && wait >= 0 && wait <= MAX_RETRY_WAIT_MS && System.currentTimeMillis() + wait < deadline) {
                                    retried429 = true;
                                    retrySame = true;
                                    try { Thread.sleep(wait); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                                } else {
                                    err = new GeminiException("Limite gratuito atingido — aguarde 1 min", false);
                                    rank = P_LIMIT;
                                }
                            } else if (code >= 500) {
                                err = new GeminiException("IA ocupada — tente de novo", false);
                                rank = P_BUSY;
                            } else {
                                // texto original da API (em inglês) só no log
                                android.util.Log.w("Dicta", "Gemini " + model + " HTTP " + code + ": " + msg);
                                err = new GeminiException("A IA recusou o pedido (código " + code + ") — tente de novo", false);
                                rank = P_UNKNOWN;
                            }
                        }
                    }
                } catch (GeminiException e) {
                    throw e;
                } catch (java.net.UnknownHostException e) {
                    throw new GeminiException("Sem internet", false);
                } catch (java.net.SocketTimeoutException e) {
                    attempts++;
                    err = new GeminiException("A IA demorou demais", false);
                    rank = P_TIMEOUT;
                } catch (Exception e) {
                    attempts++;
                    err = new GeminiException("Falha de conexão", false);
                    rank = P_UNKNOWN;
                } finally {
                    if (c != null) c.disconnect();
                }
                if (retrySame) continue;
                if (err != null && rank >= bestRank) { best = err; bestRank = rank; }
                break;
            }
        }
        throw best != null ? best : new GeminiException("Nenhum modelo disponível", false);
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
