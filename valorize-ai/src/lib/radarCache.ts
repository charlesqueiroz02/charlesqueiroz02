import type { RadarStockItem } from '../types';

/**
 * Cache do Radar na memória do app (10 min por yield mínimo).
 * Antes, Radar e Máquina de Renda baixavam a mesma lista a cada troca de aba.
 * Chamadas simultâneas compartilham a mesma requisição.
 */
const TTL = 10 * 60 * 1000;
const cache = new Map<number, { at: number; data: RadarStockItem[] }>();
const inflight = new Map<number, Promise<RadarStockItem[]>>();

export function loadRadar(minYield: number, force = false): Promise<RadarStockItem[]> {
  const hit = cache.get(minYield);
  if (!force && hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.data);
  const running = inflight.get(minYield);
  if (running && !force) return running;

  const p = fetch(`/api/stock/radar?minYield=${encodeURIComponent(minYield)}`)
    .then(async r => {
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error || 'Não foi possível carregar o Radar.');
      const data = Array.isArray(body) ? (body as RadarStockItem[]) : [];
      if (data.length) cache.set(minYield, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(minYield));
  inflight.set(minYield, p);
  return p;
}
