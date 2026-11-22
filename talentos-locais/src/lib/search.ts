import { CATEGORY_KEYWORDS, approxDistanceKm } from '../data/catalog';
import type { Availability, AttendMode, DB, ProProfile, Ratings } from '../types';
import { DAY, norm } from './utils';

export interface Interpretation {
  categories: string[];
  terms: string[];
  urgent: boolean;
  thisWeek: boolean;
  deadlineLabel?: string;
  remote: boolean;
  nearMe: boolean;
  chips: string[];
}

const STOP = new Set(
  'preciso de um uma uns umas para pra por com sem que quero procuro alguem alguém algum o a os as do da dos das no na nos nas e ou meu minha perto mim me em ate até fazer consertar avaliar ajustar urgente hoje agora sexta segunda terca quarta quinta sabado domingo semana nesta essa esta proxima pequena pequeno grande bom boa confianca confiável confiavel servico serviço'.split(' ').map(norm),
);

const WEEKDAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const reCache = new Map<string, RegExp>();
/** Palavra-chave casa no início de uma palavra; as curtas (até 5 letras) só como palavra inteira. */
function keywordRe(w: string) {
  let re = reCache.get(w);
  if (!re) {
    const k = norm(w).replace(/[-]/g, '[- ]');
    re = new RegExp(k.length <= 5 ? `\\b${k}s?\\b` : `\\b${k}`);
    reCache.set(w, re);
  }
  return re;
}

/** Interpreta pedidos em linguagem natural e os transforma em filtros. */
export function interpret(text: string, categoryNames: Record<string, string> = {}): Interpretation {
  const t = norm(text);
  const categories: string[] = [];
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => keywordRe(w).test(t))) categories.push(cat);
  }
  const urgent = /\b(urgente|urgencia|hoje|agora|emergencia)\b/.test(t);
  const day = WEEKDAYS.find((d) => new RegExp(`\\b${d}`).test(t));
  const thisWeek = !!day || /\b(semana|amanha)\b/.test(t);
  const remote = /\b(remot|online|a distancia)/.test(t);
  const nearMe = /\bperto\b|\bproxim/.test(t);
  const terms = t
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const chips: string[] = [];
  categories.forEach((c) => chips.push(categoryNames[c] ?? c));
  if (urgent) chips.push('Atendimento urgente');
  else if (day) chips.push(`Até ${day === 'terca' ? 'terça' : day === 'sabado' ? 'sábado' : day}${['sabado', 'domingo'].includes(day) ? '' : '-feira'}`);
  else if (thisWeek) chips.push('Nesta semana');
  if (remote) chips.push('Remoto');
  if (nearMe) chips.push('Mais próximos');
  return { categories, terms, urgent, thisWeek, deadlineLabel: day, remote, nearMe, chips };
}

export interface ProStats {
  reviewCount: number;
  avg?: number; // média simples (exibida)
  bayes: number; // média ponderada pelo número de avaliações (ordenação)
  confirmedJobs: number;
  references: number;
  portfolioCount: number;
  isNew: boolean;
  completeness: number; // 0..1
  minPrice?: number;
}

const PRIOR_MEAN = 4.0;
const PRIOR_WEIGHT = 5;

export const reviewScore = (r: { ratings: Ratings }) => {
  const v = Object.values(r.ratings);
  return v.reduce((a, b) => a + b, 0) / v.length;
};

export function proStats(db: DB, pro: ProProfile): ProStats {
  const reviews = db.reviews.filter((r) => r.proId === pro.id && r.status !== 'removida');
  const scores = reviews.map(reviewScore);
  const sum = scores.reduce((a, b) => a + b, 0);
  const portfolioCount = db.portfolio.filter((p) => p.proId === pro.id && p.status === 'aprovado').length;
  const prices = pro.services.map((s) => s.priceFrom).filter((x): x is number => typeof x === 'number');
  const checks = [
    !!pro.bio && pro.bio.length > 60,
    pro.services.length > 0,
    portfolioCount >= 2,
    pro.neighborhoods.length > 0,
    pro.contactVerified,
    !!pro.photo || pro.avatarHue >= 0,
  ];
  return {
    reviewCount: reviews.length,
    avg: reviews.length ? sum / reviews.length : undefined,
    bayes: (PRIOR_MEAN * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + reviews.length),
    confirmedJobs: db.orders.filter((o) => o.proId === pro.id && ['concluido', 'avaliacao_pendente', 'encerrado'].includes(o.status)).length,
    references: db.references.filter((r) => r.proId === pro.id && r.status === 'publicada').length,
    portfolioCount,
    isNew: Date.now() - pro.createdAt < 120 * DAY,
    completeness: checks.filter(Boolean).length / checks.length,
    minPrice: prices.length ? Math.min(...prices) : undefined,
  };
}

export type SortKey = 'relevancia' | 'proximo' | 'avaliacao' | 'disponivel' | 'preco';

export interface Filters {
  q: string;
  category?: string;
  neighborhood?: string; // bairro do cliente (referência de distância)
  maxKm?: number;
  maxPrice?: number;
  availability?: 'hoje' | 'semana';
  mode?: AttendMode;
  minRating?: number;
  minReviews?: number;
  hasPortfolio?: boolean;
  verified?: boolean;
  urgent?: boolean;
  sort: SortKey;
}

export interface Ranked {
  pro: ProProfile;
  stats: ProStats;
  km?: number;
  servesArea: boolean;
  score: number;
}

const AVAIL_SCORE: Record<Availability, number> = { hoje: 1.2, semana: 0.8, agenda: 0.3, indisponivel: -1 };
const AVAIL_ORDER: Record<Availability, number> = { hoje: 0, semana: 1, agenda: 2, indisponivel: 3 };

export function distanceFor(pro: ProProfile, neighborhood?: string) {
  if (!neighborhood) return { km: undefined, servesArea: false };
  if (pro.neighborhoods.includes(neighborhood)) return { km: 0, servesArea: true };
  const ds = pro.neighborhoods.map((n) => approxDistanceKm(n, neighborhood)).filter((x): x is number => x !== undefined);
  return { km: ds.length ? Math.min(...ds) : undefined, servesArea: false };
}

/**
 * Ranqueamento. Princípios:
 *  - Ausência de avaliações NÃO é tratada como baixa qualidade (componente neutro).
 *  - Profissionais novos com perfil completo recebem impulso ("Profissional Revelação").
 *  - Destaque patrocinado não altera a pontuação orgânica nem a reputação.
 */
export function rank(db: DB, f: Filters): Ranked[] {
  const it = f.q.trim() ? interpret(f.q) : undefined;
  const blockedUsers = new Set(db.users.filter((u) => u.status !== 'active').map((u) => u.id));
  const out: Ranked[] = [];

  for (const pro of db.pros) {
    if (!pro.published || blockedUsers.has(pro.userId)) continue;
    const stats = proStats(db, pro);
    const { km, servesArea } = distanceFor(pro, f.neighborhood);

    // --- filtros rígidos
    if (f.category && !pro.categories.includes(f.category)) continue;
    if (f.maxKm !== undefined && (km === undefined || km > f.maxKm)) continue;
    if (f.maxPrice !== undefined && (stats.minPrice === undefined || stats.minPrice > f.maxPrice)) continue;
    if (f.availability === 'hoje' && pro.availability !== 'hoje') continue;
    if (f.availability === 'semana' && !['hoje', 'semana'].includes(pro.availability)) continue;
    if (f.mode && !pro.modes.includes(f.mode)) continue;
    if (f.minRating && (stats.avg === undefined || stats.avg < f.minRating)) continue;
    if (f.minReviews && stats.reviewCount < f.minReviews) continue;
    if (f.hasPortfolio && stats.portfolioCount === 0) continue;
    if (f.verified && !pro.identityVerified) continue;
    if (f.urgent && !pro.urgent) continue;

    // --- relevância
    let score = 0;
    if (it) {
      const hay = norm([pro.displayName, pro.bio, ...pro.services.map((s) => s.name)].join(' '));
      const catHit = it.categories.some((c) => pro.categories.includes(c));
      const termHits = it.terms.filter((w) => hay.includes(w)).length;
      if (it.categories.length && !catHit && termHits === 0) continue; // fora do assunto
      if (!it.categories.length && it.terms.length && termHits === 0) continue;
      score += (catHit ? 3 : 0) + Math.min(4, termHits * 1.5);
      if (it.urgent && pro.urgent) score += 1;
      if (it.remote && pro.modes.includes('remoto')) score += 1;
    }
    score += servesArea ? 2 : km !== undefined ? Math.max(0, 2 - km / 5) : 0;
    score += AVAIL_SCORE[pro.availability];
    score += stats.reviewCount ? ((stats.bayes - 3) / 2) * 1.5 : 0.5; // neutro para quem ainda não tem avaliações
    if (pro.identityVerified) score += 0.5;
    if (stats.portfolioCount >= 3) score += 0.5;
    if (stats.isNew && stats.completeness >= 0.8) score += 0.8;

    out.push({ pro, stats, km, servesArea, score });
  }

  const sort = it?.nearMe && f.sort === 'relevancia' ? 'proximo' : f.sort;
  const kmOf = (r: Ranked) => r.km ?? 999;
  out.sort((a, b) => {
    switch (sort) {
      case 'proximo':
        return kmOf(a) - kmOf(b) || b.score - a.score;
      case 'avaliacao':
        return b.stats.bayes - a.stats.bayes || b.stats.reviewCount - a.stats.reviewCount;
      case 'disponivel':
        return AVAIL_ORDER[a.pro.availability] - AVAIL_ORDER[b.pro.availability] || b.score - a.score;
      case 'preco':
        return (a.stats.minPrice ?? Infinity) - (b.stats.minPrice ?? Infinity);
      default:
        return b.score - a.score;
    }
  });
  return out;
}
