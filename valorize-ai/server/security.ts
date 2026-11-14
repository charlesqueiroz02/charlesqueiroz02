import type { NextFunction, Request, Response } from 'express';

/** IP real do cliente (Netlify, proxies comuns ou conexão direta). */
export function clientIp(req: Request): string {
  const nf = req.headers['x-nf-client-connection-ip'];
  if (typeof nf === 'string' && nf) return nf;
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'desconhecido';
}

/**
 * Limite simples de requisições por IP, em memória.
 * Protege a cota do Gemini e as fontes de cotação contra abuso.
 * Observação: no Netlify cada instância tem a própria memória, então o limite é
 * "por instância" — suficiente para barrar abuso casual, não um ataque distribuído.
 */
export function rateLimit(opts: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = clientIp(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    // Limpeza ocasional para a memória não crescer sem limite
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: opts.message });
    }
    next();
  };
}

/** Cabeçalhos básicos de segurança para as respostas da API. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** Converte um valor do corpo da requisição em número finito dentro de limites. */
export function finiteNumber(v: unknown, min = -1e9, max = 1e9): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

/** Texto curto e limpo para entrar no prompt da IA (sem quebras de linha nem controle). */
export function cleanText(v: unknown, maxLen = 80): string {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}
