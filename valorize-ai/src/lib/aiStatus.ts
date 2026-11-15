/**
 * Diagnóstico da IA (Gemini): por que a análise não veio e o que fazer.
 * Usado pelo servidor (classificar o erro) e pela tela (mostrar a causa e a solução).
 */
export type AiReason = 'ok' | 'sem_chave' | 'chave_invalida' | 'modelo' | 'limite' | 'tempo' | 'vazio' | 'bloqueado' | 'outro';

/** Limpa a chave colada: espaços, quebras de linha, aspas e um "GEMINI_API_KEY=" colado junto. */
export function cleanApiKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^GEMINI_API_KEY\s*=\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

/** Classifica a mensagem de erro do Gemini numa causa conhecida. */
export function classifyAiError(message: string, status?: number): AiReason {
  const m = (message || '').toLowerCase();
  if (/timeout/.test(m)) return 'tempo';
  if (status === 429 || /quota|resource_exhausted|rate limit|too many requests/.test(m)) return 'limite';
  if (/api key not valid|api_key_invalid|invalid api key|api key expired|permission_denied|unauthenticated/.test(m) || status === 401 || status === 403) return 'chave_invalida';
  if (status === 404 || /not found|is not supported|unknown model|models\/.* is not/.test(m)) return 'modelo';
  if (/safety|blocked/.test(m)) return 'bloqueado';
  return 'outro';
}

/** Texto para a tela: o que aconteceu e onde corrigir. */
export const AI_REASON_TEXT: Record<Exclude<AiReason, 'ok'>, { title: string; fix: string }> = {
  sem_chave: {
    title: 'A chave do Gemini não está configurada no servidor.',
    fix: 'Na Vercel: Settings → Environment Variables → crie GEMINI_API_KEY com a sua chave e faça um Redeploy.',
  },
  chave_invalida: {
    title: 'O Google recusou a chave do Gemini (inválida, expirada ou sem permissão).',
    fix: 'Gere uma chave nova em aistudio.google.com/apikey, troque o valor de GEMINI_API_KEY na Vercel e faça um Redeploy.',
  },
  modelo: {
    title: 'O modelo de IA configurado não existe ou não está liberado para a sua chave.',
    fix: 'Na Vercel, defina GEMINI_MODEL = gemini-2.5-flash (ou outro modelo listado no AI Studio) e faça um Redeploy.',
  },
  limite: {
    title: 'O limite de uso gratuito do Gemini foi atingido.',
    fix: 'Espere alguns minutos (ou até o dia seguinte) ou ative o faturamento no Google AI Studio.',
  },
  tempo: {
    title: 'A IA demorou demais para responder.',
    fix: 'Tente de novo em instantes.',
  },
  vazio: {
    title: 'A IA respondeu sem texto.',
    fix: 'Tente de novo; se continuar, troque GEMINI_MODEL na Vercel por gemini-2.5-flash.',
  },
  bloqueado: {
    title: 'A IA recusou responder por filtro de segurança.',
    fix: 'Tente de novo ou com outra ação.',
  },
  outro: {
    title: 'A IA não respondeu por um erro inesperado.',
    fix: 'Tente de novo. Se persistir, veja o detalhe abaixo ou a aba Logs do projeto na Vercel.',
  },
};

/** Extrai só a frase do erro (o Gemini às vezes devolve um JSON inteiro como mensagem). */
export function errorSummary(raw: string): string {
  try {
    const j = JSON.parse(raw);
    const msg = j?.error?.message;
    if (typeof msg === 'string') return msg;
  } catch { /* não era JSON */ }
  const m = raw.match(/"message"\s*:\s*"([^"]+)"/);
  return m ? m[1] : raw;
}

/** Remove qualquer coisa parecida com chave de API de uma mensagem antes de mostrá-la. */
export const redactSecrets = (s: string) =>
  errorSummary(s).replace(/AIza[0-9A-Za-z_-]{10,}/g, '[chave]').replace(/AQ\.[0-9A-Za-z_.-]{10,}/g, '[chave]').slice(0, 160);
