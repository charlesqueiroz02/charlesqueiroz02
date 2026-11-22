import { describe, expect, it } from 'vitest';
import { interpret, rank, proStats } from './search';
import type { DB, ProProfile } from '../types';

describe('interpret (linguagem natural)', () => {
  it('soldador para portão → Soldagem', () => {
    expect(interpret('Preciso de um soldador para consertar um portão.').categories).toEqual(['solda']); // "porta" não casa com "portão"
  });
  it('costureira até sexta → Costura + prazo', () => {
    const it = interpret('Quero uma costureira para ajustar um vestido até sexta-feira.');
    expect(it.categories).toContain('costura');
    expect(it.thisWeek).toBe(true);
    expect(it.deadlineLabel).toBe('sexta');
  });
  it('barulho no carro → Automotivo', () => {
    expect(interpret('Preciso de um mecânico para avaliar um barulho no carro.').categories).toEqual(['auto']);
  });
  it('estrutura metálica → Soldagem', () => {
    expect(interpret('Procuro alguém para fazer uma pequena estrutura metálica.').categories).toContain('solda');
  });
  it('detecta urgência e "perto de mim"', () => {
    const it = interpret('eletricista urgente perto de mim');
    expect(it.urgent).toBe(true);
    expect(it.nearMe).toBe(true);
    expect(it.categories).toContain('casa');
  });
});

const base = (id: string, p: Partial<ProProfile> = {}): ProProfile => ({
  id, userId: 'u' + id, slug: id, displayName: id, avatarHue: 1, categories: ['casa'], services: [{ id: 's', name: 'Reparo', priceFrom: 100 }], bio: 'x'.repeat(80),
  experienceYears: 5, city: 'C', neighborhoods: ['Centro'], modes: ['local'], availability: 'semana', urgent: false, identityVerified: false, contactVerified: true,
  credentials: [], plan: 'free', sponsored: false, published: true, createdAt: Date.now() - 400 * 86400000, ...p,
});
const db = (pros: ProProfile[], reviews: DB['reviews'] = []): DB => ({
  version: 1, users: pros.map((p) => ({ id: p.userId, status: 'active' }) as DB['users'][number]), pros, portfolio: [], reviews, references: [], requests: [], quotes: [], orders: [],
  conversations: [], messages: [], reports: [], verifications: [], notifications: [], plans: [], categories: [], regions: [], audit: [], views: [], income: [], loginAttempts: {}, resetCodes: {},
});
const rv = (proId: string, n: number) => ({ id: 'r' + Math.random(), orderId: 'o', proId, clientId: 'c', comment: '', status: 'publicada' as const, createdAt: 0, ratings: { quality: n, punctuality: n, communication: n, agreement: n, value: n } });

describe('rank', () => {
  it('não trata ausência de avaliações como baixa qualidade', () => {
    const d = db([base('novo'), base('ruim')], [rv('ruim', 2), rv('ruim', 2)]);
    const r = rank(d, { q: '', sort: 'relevancia' });
    expect(r[0]!.pro.id).toBe('novo');
  });
  it('"melhor avaliado" pondera o número de avaliações', () => {
    const d = db([base('um5'), base('dez47')], [rv('um5', 5), ...Array.from({ length: 10 }, () => rv('dez47', 4.7))]);
    const r = rank(d, { q: '', sort: 'avaliacao' });
    expect(r[0]!.pro.id).toBe('dez47');
  });
  it('patrocínio não altera a pontuação orgânica', () => {
    const a = rank(db([base('a'), base('b', { sponsored: true, plan: 'pro' })]), { q: '', sort: 'relevancia' });
    expect(a[0]!.score).toBe(a[1]!.score);
  });
  it('filtra por bairro/distância e categoria', () => {
    const d = db([base('perto'), base('longe', { neighborhoods: ['Sousas'] }), base('outra', { categories: ['auto'] })]);
    const r = rank(d, { q: '', category: 'casa', neighborhood: 'Centro', maxKm: 3, sort: 'proximo' });
    expect(r.map((x) => x.pro.id)).toEqual(['perto']);
  });
  it('perfil novo e completo conta como "revelação"', () => {
    const p = base('n', { createdAt: Date.now() });
    const s = proStats(db([p]), p);
    expect(s.isNew).toBe(true);
  });
});
