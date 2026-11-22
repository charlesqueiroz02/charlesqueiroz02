// Camada de regras de negócio e autorização (o "backend" do modo demonstração).
// Toda ação valida dados e permissões aqui — a interface nunca é a única barreira.
// Em produção, as mesmas regras existem como políticas RLS/funções no Supabase.
import { hashPassword, newSalt, passwordProblems } from '../lib/crypto';
import { can, type AdminPerm } from '../lib/permissions';
import { DAY, slugify, uid } from '../lib/utils';
import type {
  AttendMode, Availability, CommunityReference, Credential, DB, Order, OrderStatus, PortfolioItem, ProProfile, Quote, Ratings,
  ReportTarget, ServiceRequest, User,
} from '../types';
import { AppError, commit, getDB, getSessionId, setSession } from './store';

// ---------------------------------------------------------------- helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new AppError(msg);
}

function me(d: DB = getDB()): User {
  const u = d.users.find((x) => x.id === getSessionId());
  need(u, 'Entre na sua conta para continuar.');
  need(u.status === 'active', 'Sua conta está suspensa. Fale com o suporte para contestar.');
  return u;
}
function myPro(d: DB): ProProfile {
  const u = me(d);
  const p = d.pros.find((x) => x.userId === u.id);
  need(p, 'Você ainda não tem um perfil profissional.');
  return p;
}
function admin(d: DB, perm: AdminPerm): User {
  const u = me(d);
  need(can(u, perm), 'Você não tem permissão para esta ação.');
  return u;
}
function audit(d: DB, adminId: string, action: string, target: string, note?: string) {
  d.audit.unshift({ id: uid('a_'), adminId, action, target, note, at: Date.now() });
}
export function notify(d: DB, userId: string, text: string, link: string) {
  d.notifications.unshift({ id: uid('n_'), userId, text, link, read: false, at: Date.now() });
}
const proUser = (d: DB, proId: string) => d.pros.find((p) => p.id === proId)?.userId;
function sysMsg(d: DB, clientId: string, proId: string, text: string, requestId?: string) {
  const conv = ensureConv(d, clientId, proId, requestId);
  d.messages.push({ id: uid('m_'), convId: conv.id, senderId: 'system', text, kind: 'system', at: Date.now(), readBy: [] });
  conv.lastAt = Date.now();
}
function ensureConv(d: DB, clientId: string, proId: string, requestId?: string) {
  let c = d.conversations.find((x) => x.clientId === clientId && x.proId === proId);
  if (!c) {
    const pu = proUser(d, proId);
    need(pu, 'Profissional não encontrado.');
    c = { id: uid('c_'), clientId, proId, proUserId: pu, requestId, lastAt: Date.now() };
    d.conversations.push(c);
  }
  if (requestId) c.requestId = requestId;
  return c;
}

// ---------------------------------------------------------------- autenticação
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  city: string;
  neighborhood: string;
  intent: 'contratar' | 'oferecer' | 'ambos';
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
  honeypot: string; // campo invisível: robôs preenchem
  startedAt: number; // formulários preenchidos rápido demais são bloqueados
}

export async function signup(i: SignupInput) {
  need(!i.honeypot && Date.now() - i.startedAt > 2500, 'Não foi possível concluir o cadastro. Tente novamente em alguns segundos.');
  const email = i.email.trim().toLowerCase();
  need(EMAIL_RE.test(email), 'Informe um e-mail válido.');
  const pw = passwordProblems(i.password);
  need(!pw, pw!);
  const name = clean(i.name, 60);
  need(name.length >= 2, 'Informe um nome de exibição.');
  need(i.city.trim() && i.neighborhood.trim(), 'Informe cidade e bairro.');
  need(i.terms && i.privacy, 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
  need(!getDB().users.some((u) => u.email === email), 'Já existe uma conta com este e-mail.');
  const salt = newSalt();
  const passwordHash = await hashPassword(i.password, salt);
  const id = commit((d) => {
    const u: User = {
      id: uid('u_'), email, passwordHash, salt, name, city: clean(i.city, 60), neighborhood: clean(i.neighborhood, 60), phoneVerified: false,
      roles: i.intent === 'contratar' ? ['client'] : ['client', 'pro'], status: 'active',
      consent: { terms: true, privacy: true, marketing: i.marketing, at: Date.now() }, lowComplexity: false, saved: [], blocked: [], createdAt: Date.now(),
    };
    d.users.push(u);
    notify(d, u.id, 'Bem-vindo ao TalentosLocais! Complete seu perfil para começar.', '/perfil');
    return u.id;
  });
  setSession(id);
  return id;
}

export async function login(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const d = getDB();
  const att = d.loginAttempts[email];
  if (att && att.lockedUntil > Date.now()) {
    const min = Math.ceil((att.lockedUntil - Date.now()) / 60000);
    throw new AppError(`Muitas tentativas. Tente novamente em ${min} min ou recupere sua senha.`);
  }
  const u = d.users.find((x) => x.email === email);
  const ok = !!u && (await hashPassword(password, u.salt)) === u.passwordHash;
  if (!ok) {
    commit((d) => {
      const a = d.loginAttempts[email] ?? { count: 0, lockedUntil: 0 };
      a.count += 1;
      if (a.count >= MAX_ATTEMPTS) {
        a.lockedUntil = Date.now() + LOCK_MS;
        a.count = 0;
      }
      d.loginAttempts[email] = a;
    });
    throw new AppError('E-mail ou senha incorretos.'); // mensagem genérica: não revela se o e-mail existe
  }
  need(u.status === 'active', `Conta suspensa${u.suspendReason ? `: ${u.suspendReason}` : ''}. Você pode contestar pelo suporte.`);
  commit((d) => delete d.loginAttempts[email]);
  setSession(u.id);
}

export const logout = () => setSession(null);

/**
 * Recuperação de senha. Sem serviço de e-mail integrado, o código é exibido
 * na tela como "caixa de entrada de demonstração" — nunca em produção.
 */
export function requestReset(emailRaw: string): string | null {
  const email = emailRaw.trim().toLowerCase();
  need(EMAIL_RE.test(email), 'Informe um e-mail válido.');
  const u = getDB().users.find((x) => x.email === email);
  if (!u) return null;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  commit((d) => (d.resetCodes[email] = { code, exp: Date.now() + 15 * 60000 }));
  return code;
}

export async function resetPassword(emailRaw: string, code: string, newPw: string) {
  const email = emailRaw.trim().toLowerCase();
  const rc = getDB().resetCodes[email];
  need(rc && rc.code === code.trim() && rc.exp > Date.now(), 'Código inválido ou expirado.');
  const p = passwordProblems(newPw);
  need(!p, p!);
  const salt = newSalt();
  const h = await hashPassword(newPw, salt);
  commit((d) => {
    const u = d.users.find((x) => x.email === email)!;
    u.salt = salt;
    u.passwordHash = h;
    delete d.resetCodes[email];
    delete d.loginAttempts[email];
  });
}

export function updateMe(patch: Partial<Pick<User, 'name' | 'city' | 'neighborhood' | 'phone' | 'lowComplexity'>>) {
  commit((d) => {
    const u = me(d);
    if (patch.name !== undefined) {
      const n = clean(patch.name, 60);
      need(n.length >= 2, 'Nome muito curto.');
      u.name = n;
    }
    if (patch.city !== undefined) u.city = clean(patch.city, 60);
    if (patch.neighborhood !== undefined) u.neighborhood = clean(patch.neighborhood, 60);
    if (patch.phone !== undefined) {
      const ph = patch.phone.replace(/\D/g, '');
      need(!ph || (ph.length >= 10 && ph.length <= 13), 'Telefone inválido.');
      if (ph !== u.phone) u.phoneVerified = false;
      u.phone = ph || undefined;
    }
    if (patch.lowComplexity !== undefined) u.lowComplexity = patch.lowComplexity;
  });
}

export function setMarketingConsent(v: boolean) {
  commit((d) => {
    const u = me(d);
    u.consent = { ...u.consent, marketing: v, at: Date.now() };
  });
}

/** Portabilidade (LGPD art. 18, V): exporta os dados do titular. */
export function exportMyData() {
  const d = getDB();
  const u = me(d);
  const pro = d.pros.find((p) => p.userId === u.id);
  const { passwordHash: _h, salt: _s, ...profile } = u;
  void _h; void _s;
  return {
    exportedAt: new Date().toISOString(),
    account: profile,
    professionalProfile: pro ?? null,
    portfolio: pro ? d.portfolio.filter((x) => x.proId === pro.id) : [],
    requests: d.requests.filter((r) => r.clientId === u.id),
    orders: d.orders.filter((o) => o.clientId === u.id || o.proId === pro?.id),
    reviewsWritten: d.reviews.filter((r) => r.clientId === u.id),
    referencesWritten: d.references.filter((r) => r.authorId === u.id),
    messagesSent: d.messages.filter((m) => m.senderId === u.id),
    reports: d.reports.filter((r) => r.reporterId === u.id),
  };
}

/** Exclusão de conta (LGPD art. 18, VI). Avaliações escritas são anonimizadas. */
export async function deleteAccount(password: string) {
  const u = me();
  need((await hashPassword(password, u.salt)) === u.passwordHash, 'Senha incorreta.');
  commit((d) => {
    const pro = d.pros.find((p) => p.userId === u.id);
    if (pro) {
      d.pros = d.pros.filter((p) => p.id !== pro.id);
      d.portfolio = d.portfolio.filter((p) => p.proId !== pro.id);
      d.views = d.views.filter((v) => v.proId !== pro.id);
      d.income = d.income.filter((v) => v.proId !== pro.id);
    }
    d.references = d.references.filter((r) => r.authorId !== u.id);
    d.notifications = d.notifications.filter((n) => n.userId !== u.id);
    d.messages = d.messages.map((m) => (m.senderId === u.id ? { ...m, text: '[mensagem removida — conta excluída]' } : m));
    d.requests.filter((r) => r.clientId === u.id).forEach((r) => {
      r.photos = [];
      r.description = '[removido]';
      if (r.status === 'aberta') r.status = 'cancelada';
    });
    // registro mínimo mantido apenas para integridade de avaliações e pedidos
    Object.assign(d.users.find((x) => x.id === u.id)!, {
      email: `excluido+${u.id}@invalid`, name: 'Usuário removido', phone: undefined, passwordHash: '', salt: '', status: 'suspended', suspendReason: 'Conta excluída pelo titular', saved: [], blocked: [], roles: [],
    } satisfies Partial<User>);
  });
  setSession(null);
}

// ---------------------------------------------------------------- perfil profissional
export interface ProInput {
  displayName: string;
  categories: string[];
  bio: string;
  experienceYears: number;
  neighborhoods: string[];
  city: string;
  modes: AttendMode[];
  availability: Availability;
  urgent: boolean;
  services: { name: string; priceFrom?: number; unit?: string }[];
  photo?: string;
}

function validatePro(i: ProInput) {
  const name = clean(i.displayName, 60);
  need(name.length >= 3, 'Informe seu nome profissional ou comercial.');
  need(i.categories.length > 0 && i.categories.length <= 3, 'Escolha de 1 a 3 categorias.');
  need(i.neighborhoods.length > 0, 'Informe pelo menos um bairro atendido.');
  need(i.modes.length > 0, 'Escolha como você atende.');
  need(i.services.length > 0, 'Cadastre pelo menos um serviço.');
  need(i.experienceYears >= 0 && i.experienceYears <= 70, 'Tempo de experiência inválido.');
  const services = i.services.slice(0, 15).map((s) => {
    const n = clean(s.name, 80);
    need(n.length >= 3, 'Dê um nome a cada serviço.');
    need(s.priceFrom === undefined || (s.priceFrom >= 0 && s.priceFrom < 1_000_000), 'Preço inválido.');
    return { id: uid('s_'), name: n, priceFrom: s.priceFrom, unit: s.unit ? clean(s.unit, 30) : undefined };
  });
  return { ...i, displayName: name, bio: clean(i.bio, 1200), services };
}

export function saveProProfile(input: ProInput) {
  const v = validatePro(input);
  return commit((d) => {
    const u = me(d);
    let p = d.pros.find((x) => x.userId === u.id);
    if (!p) {
      let slug = slugify(v.displayName);
      if (d.pros.some((x) => x.slug === slug)) slug += '-' + uid().slice(0, 4);
      p = {
        id: uid('p_'), userId: u.id, slug, displayName: v.displayName, avatarHue: Math.floor(Math.random() * 360), categories: [], services: [], bio: '',
        experienceYears: 0, city: v.city, neighborhoods: [], modes: [], availability: 'semana', urgent: false, identityVerified: false,
        contactVerified: u.phoneVerified, credentials: [], plan: 'free', sponsored: false, published: true, createdAt: Date.now(),
      };
      d.pros.push(p);
      if (!u.roles.includes('pro')) u.roles.push('pro');
    }
    Object.assign(p, {
      displayName: v.displayName, categories: v.categories, bio: v.bio, experienceYears: v.experienceYears, neighborhoods: v.neighborhoods,
      city: clean(v.city, 60), modes: v.modes, availability: v.availability, urgent: v.urgent, services: v.services,
    });
    if (v.photo !== undefined) p.photo = v.photo || undefined;
    return p.id;
  });
}

export function setAvailability(a: Availability) {
  commit((d) => (myPro(d).availability = a));
}
export function setPublished(v: boolean) {
  commit((d) => (myPro(d).published = v));
}

/** Verificação de contato: sem SMS integrado, o código aparece na tela (demonstração). */
let pendingPhoneCode: string | null = null;
export function startPhoneVerification() {
  const u = me();
  need(u.phone, 'Cadastre um telefone primeiro.');
  pendingPhoneCode = String(Math.floor(1000 + Math.random() * 9000));
  return pendingPhoneCode;
}
export function confirmPhone(code: string) {
  need(pendingPhoneCode && code.trim() === pendingPhoneCode, 'Código incorreto.');
  commit((d) => {
    const u = me(d);
    u.phoneVerified = true;
    const p = d.pros.find((x) => x.userId === u.id);
    if (p) p.contactVerified = true;
  });
  pendingPhoneCode = null;
}

export function addPortfolio(item: Pick<PortfolioItem, 'category' | 'title' | 'description' | 'approxDate' | 'image' | 'beforeImage'>) {
  commit((d) => {
    const p = myPro(d);
    const limit = d.plans.find((x) => x.id === p.plan)?.portfolioLimit ?? 8;
    need(d.portfolio.filter((x) => x.proId === p.id && x.status !== 'recusado').length < limit, `Seu plano permite até ${limit} trabalhos no portfólio.`);
    need(clean(item.title, 80).length >= 3, 'Dê um título ao trabalho.');
    need(p.categories.includes(item.category), 'Escolha uma das suas categorias.');
    d.portfolio.push({
      id: uid('f_'), proId: p.id, category: item.category, title: clean(item.title, 80), description: clean(item.description, 600),
      approxDate: item.approxDate, image: item.image, beforeImage: item.beforeImage, hue: Math.floor(Math.random() * 360),
      // fotos passam por moderação antes de aparecer publicamente
      status: item.image || item.beforeImage ? 'pendente' : 'aprovado', createdAt: Date.now(),
    });
  });
}
export function removePortfolio(id: string) {
  commit((d) => {
    const p = myPro(d);
    const it = d.portfolio.find((x) => x.id === id);
    need(it && it.proId === p.id, 'Item não encontrado.');
    d.portfolio = d.portfolio.filter((x) => x.id !== id);
  });
}

export function addCredential(name: string, kind: Credential['kind']) {
  commit((d) => {
    const p = myPro(d);
    const n = clean(name, 100);
    need(n.length >= 3, 'Informe o nome do curso ou qualificação.');
    p.credentials.push({ id: uid('c_'), name: n, kind, status: 'declarado' });
  });
}
export function removeCredential(id: string) {
  commit((d) => {
    const p = myPro(d);
    p.credentials = p.credentials.filter((c) => c.id !== id);
  });
}

export function requestVerification(kind: 'identidade' | 'credencial', note: string, credentialId?: string) {
  commit((d) => {
    const p = myPro(d);
    need(!d.verifications.some((v) => v.proId === p.id && v.kind === kind && v.credentialId === credentialId && v.status === 'pendente'), 'Já existe uma solicitação em análise.');
    if (kind === 'credencial') {
      const c = p.credentials.find((x) => x.id === credentialId);
      need(c, 'Credencial não encontrada.');
      c.status = 'em_analise';
    }
    d.verifications.push({ id: uid('ver_'), proId: p.id, kind, credentialId, note: clean(note, 400), status: 'pendente', createdAt: Date.now() });
  });
}

/** Plano pago sem provedor de pagamento: só um teste demonstrativo, sem cobrança. */
export function setPlanDemo(planId: 'free' | 'pro') {
  commit((d) => {
    const p = myPro(d);
    p.plan = planId;
    if (planId === 'free') p.sponsored = false;
  });
}
export function setSponsored(v: boolean) {
  commit((d) => {
    const p = myPro(d);
    need(!v || p.plan === 'pro', 'O destaque patrocinado está disponível no plano Profissional.');
    p.sponsored = v;
  });
}

export function declareIncome(amount: number, orderId?: string) {
  need(amount > 0 && amount < 1_000_000, 'Valor inválido.');
  commit((d) => {
    const p = myPro(d);
    if (orderId) need(d.orders.some((o) => o.id === orderId && o.proId === p.id), 'Pedido inválido.');
    d.income.push({ id: uid('i_'), proId: p.id, orderId, amount, at: Date.now() });
  });
}

// ---------------------------------------------------------------- cliente
export function toggleSave(proId: string) {
  commit((d) => {
    const u = me(d);
    u.saved = u.saved.includes(proId) ? u.saved.filter((x) => x !== proId) : [...u.saved, proId];
  });
}

const viewed = new Set<string>();
export function recordView(proId: string) {
  const d = getDB();
  const viewer = getSessionId();
  const pro = d.pros.find((p) => p.id === proId);
  if (!pro || pro.userId === viewer || viewed.has(proId)) return; // não conta a própria visita nem repetições
  viewed.add(proId);
  commit((d) => d.views.push({ proId, at: Date.now() }));
}

export interface RequestInput {
  title: string;
  description: string;
  category: string;
  details: string;
  photos: string[];
  neighborhood: string;
  city: string;
  preferredDate: string;
  urgent: boolean;
  proIds: string[];
  publicBoard: boolean;
}

export function createRequest(i: RequestInput) {
  return commit((d) => {
    const u = me(d);
    const title = clean(i.title, 100);
    need(title.length >= 5, 'Descreva o serviço em poucas palavras (título).');
    need(clean(i.description, 2000).length >= 10, 'Explique um pouco melhor o que você precisa.');
    need(d.categories.some((c) => c.id === i.category && c.active), 'Escolha uma categoria.');
    need(i.proIds.length > 0 || i.publicBoard, 'Escolha um profissional ou publique no Mural de Oportunidades.');
    need(i.photos.length <= 4, 'Envie no máximo 4 fotos.');
    const recent = d.requests.filter((r) => r.clientId === u.id && Date.now() - r.createdAt < 3600000).length;
    need(recent < 10, 'Você criou muitas solicitações na última hora. Aguarde um pouco.');
    const proIds = i.proIds.filter((id) => d.pros.some((p) => p.id === id && p.userId !== u.id)).slice(0, 5);
    const r: ServiceRequest = {
      id: uid('r_'), clientId: u.id, title, description: clean(i.description, 2000), category: i.category, details: clean(i.details, 500), photos: i.photos,
      neighborhood: clean(i.neighborhood, 60), city: clean(i.city, 60), preferredDate: i.preferredDate, urgent: i.urgent, invitedProIds: proIds,
      publicBoard: i.publicBoard, interests: [], status: 'aberta', createdAt: Date.now(),
    };
    d.requests.push(r);
    for (const pid of proIds) {
      const pu = proUser(d, pid)!;
      notify(d, pu, `Nova solicitação de orçamento: ${title}`, `/solicitacao/${r.id}`);
      sysMsg(d, u.id, pid, `Solicitação de orçamento enviada: "${title}"`, r.id);
    }
    if (i.publicBoard) {
      d.pros.filter((p) => p.categories.includes(i.category) && p.userId !== u.id && !proIds.includes(p.id) && (p.neighborhoods.includes(r.neighborhood) || p.city === r.city))
        .forEach((p) => notify(d, p.userId, `Nova oportunidade no Mural: ${title}`, '/mural'));
    }
    return r.id;
  });
}

export function cancelRequest(id: string) {
  commit((d) => {
    const u = me(d);
    const r = d.requests.find((x) => x.id === id);
    need(r && r.clientId === u.id, 'Solicitação não encontrada.');
    need(r.status === 'aberta', 'Esta solicitação não pode mais ser cancelada aqui.');
    r.status = 'cancelada';
    r.invitedProIds.forEach((pid) => notify(d, proUser(d, pid)!, `Solicitação cancelada pelo cliente: ${r.title}`, `/solicitacao/${r.id}`));
  });
}

/** Mural: profissional compatível demonstra interesse (vê apenas o resumo). */
export function expressInterest(requestId: string, message: string) {
  commit((d) => {
    const p = myPro(d);
    const r = d.requests.find((x) => x.id === requestId);
    need(r && r.publicBoard && r.status === 'aberta', 'Oportunidade indisponível.');
    need(r.clientId !== p.userId, 'Esta oportunidade é sua.');
    need(p.categories.includes(r.category), 'Esta oportunidade não é da sua categoria.');
    need(!r.interests.some((x) => x.proId === p.id), 'Você já demonstrou interesse.');
    need(r.interests.length < 15, 'Esta oportunidade já recebeu muitos interessados.');
    r.interests.push({ proId: p.id, message: clean(message, 300), at: Date.now() });
    notify(d, r.clientId, `${p.displayName} tem interesse em "${r.title}"`, `/solicitacao/${r.id}`);
  });
}

/** O cliente decide quem pode ver os detalhes completos e enviar orçamento. */
export function inviteToRequest(requestId: string, proId: string) {
  commit((d) => {
    const u = me(d);
    const r = d.requests.find((x) => x.id === requestId);
    need(r && r.clientId === u.id && r.status === 'aberta', 'Solicitação indisponível.');
    need(!r.invitedProIds.includes(proId), 'Profissional já convidado.');
    need(r.invitedProIds.length < 8, 'Limite de profissionais convidados atingido.');
    r.invitedProIds.push(proId);
    notify(d, proUser(d, proId)!, `Você foi convidado a enviar orçamento: ${r.title}`, `/solicitacao/${r.id}`);
    sysMsg(d, u.id, proId, `Convite para orçamento: "${r.title}"`, r.id);
  });
}

// ---------------------------------------------------------------- orçamentos
export type QuoteInput = Pick<Quote, 'description' | 'labor' | 'materialsIncluded' | 'materialsValue' | 'travel' | 'deadlineDays' | 'validUntil' | 'paymentTerms' | 'warranty' | 'notes'>;

export function sendQuote(requestId: string, i: QuoteInput) {
  commit((d) => {
    const p = myPro(d);
    const r = d.requests.find((x) => x.id === requestId);
    need(r && r.status === 'aberta', 'Solicitação indisponível.');
    need(r.invitedProIds.includes(p.id), 'Apenas profissionais convidados pelo cliente podem enviar orçamento.');
    need(clean(i.description, 1500).length >= 10, 'Descreva o serviço incluído no orçamento.');
    const nums = [i.labor, i.materialsValue, i.travel];
    need(nums.every((n) => Number.isFinite(n) && n >= 0 && n < 1_000_000), 'Valores inválidos.');
    need(i.labor > 0, 'Informe o valor da mão de obra.');
    need(i.deadlineDays > 0 && i.deadlineDays <= 365, 'Prazo inválido.');
    need(i.validUntil && new Date(i.validUntil).getTime() > Date.now() - DAY, 'A validade precisa ser uma data futura.');
    d.quotes.filter((q) => q.requestId === r.id && q.proId === p.id && ['enviada', 'alteracao_solicitada'].includes(q.status)).forEach((q) => (q.status = 'substituida'));
    d.quotes.push({
      id: uid('q_'), requestId, proId: p.id, description: clean(i.description, 1500), labor: i.labor, materialsIncluded: i.materialsIncluded,
      materialsValue: i.materialsIncluded ? i.materialsValue : 0, travel: i.travel, deadlineDays: i.deadlineDays, validUntil: i.validUntil,
      paymentTerms: clean(i.paymentTerms, 200), warranty: clean(i.warranty, 200), notes: clean(i.notes, 600), status: 'enviada', createdAt: Date.now(),
    });
    notify(d, r.clientId, `${p.displayName} enviou um orçamento para "${r.title}"`, `/solicitacao/${r.id}`);
    sysMsg(d, r.clientId, p.id, `Orçamento enviado para "${r.title}"`, r.id);
  });
}

export const quoteTotal = (q: Quote) => q.labor + (q.materialsIncluded ? q.materialsValue : 0) + q.travel;

function clientQuote(d: DB, quoteId: string) {
  const u = me(d);
  const q = d.quotes.find((x) => x.id === quoteId);
  need(q, 'Orçamento não encontrado.');
  const r = d.requests.find((x) => x.id === q.requestId)!;
  need(r.clientId === u.id, 'Você não tem acesso a este orçamento.');
  need(r.status === 'aberta' && ['enviada', 'alteracao_solicitada'].includes(q.status), 'Este orçamento não está mais disponível.');
  return { u, q, r };
}

export function acceptQuote(quoteId: string) {
  return commit((d) => {
    const { u, q, r } = clientQuote(d, quoteId);
    need(new Date(q.validUntil).getTime() + DAY > Date.now(), 'Este orçamento expirou. Peça uma nova proposta.');
    q.status = 'aceita';
    r.status = 'contratada';
    d.quotes.filter((x) => x.requestId === r.id && x.id !== q.id && ['enviada', 'alteracao_solicitada'].includes(x.status)).forEach((x) => {
      x.status = 'recusada';
      notify(d, proUser(d, x.proId)!, `O cliente escolheu outra proposta para "${r.title}"`, `/solicitacao/${r.id}`);
    });
    const o: Order = {
      id: uid('o_'), requestId: r.id, quoteId: q.id, clientId: u.id, proId: q.proId, title: r.title, agreedValue: quoteTotal(q), status: 'proposta_aceita',
      paymentInformedBy: [], history: [{ at: Date.now(), by: u.id, action: 'Proposta aceita' }], createdAt: Date.now(),
    };
    d.orders.push(o);
    notify(d, proUser(d, q.proId)!, `Sua proposta para "${r.title}" foi aceita! Combine a data.`, `/pedido/${o.id}`);
    sysMsg(d, u.id, q.proId, `Proposta aceita. Pedido criado: "${r.title}"`, r.id);
    return o.id;
  });
}

export function declineQuote(quoteId: string) {
  commit((d) => {
    const { q, r } = clientQuote(d, quoteId);
    q.status = 'recusada';
    notify(d, proUser(d, q.proId)!, `Proposta recusada para "${r.title}"`, `/solicitacao/${r.id}`);
  });
}

export function requestQuoteChange(quoteId: string, text: string) {
  const t = clean(text, 500);
  need(t.length >= 5, 'Explique o que gostaria de alterar.');
  commit((d) => {
    const { q, r } = clientQuote(d, quoteId);
    q.status = 'alteracao_solicitada';
    q.changeRequest = t;
    notify(d, proUser(d, q.proId)!, `Cliente pediu alterações na proposta para "${r.title}"`, `/solicitacao/${r.id}`);
    sysMsg(d, r.clientId, q.proId, `Pedido de alteração na proposta: ${t}`, r.id);
  });
}

// ---------------------------------------------------------------- pedidos
function party(d: DB, orderId: string) {
  const u = me(d);
  const o = d.orders.find((x) => x.id === orderId);
  need(o, 'Pedido não encontrado.');
  const pu = proUser(d, o.proId);
  const role = o.clientId === u.id ? 'client' : pu === u.id ? 'pro' : null;
  need(role, 'Você não participa deste pedido.');
  const other = role === 'client' ? pu! : o.clientId;
  return { u, o, role, other };
}

function move(d: DB, o: Order, by: string, status: OrderStatus, action: string, note?: string) {
  o.status = status;
  o.history.push({ at: Date.now(), by, action, note });
}

const OPEN: OrderStatus[] = ['proposta_aceita', 'agendado', 'em_andamento'];

export function scheduleOrder(orderId: string, when: string, address: string) {
  commit((d) => {
    const { u, o, other } = party(d, orderId);
    need(['proposta_aceita', 'agendado'].includes(o.status), 'Não é possível agendar neste momento.');
    need(when && new Date(when).getTime() > Date.now(), 'Escolha uma data futura.');
    o.scheduledAt = when;
    if (address.trim()) o.addressShared = clean(address, 200);
    move(d, o, u.id, 'agendado', 'Serviço agendado', new Date(when).toLocaleString('pt-BR'));
    notify(d, other, `Serviço agendado: ${o.title}`, `/pedido/${o.id}`);
  });
}

/** Reagendamento exige confirmação da outra parte. */
export function requestReschedule(orderId: string, to: string) {
  commit((d) => {
    const { u, o, other } = party(d, orderId);
    need(o.status === 'agendado', 'Só é possível reagendar serviços agendados.');
    need(to && new Date(to).getTime() > Date.now(), 'Escolha uma data futura.');
    o.rescheduleRequest = { by: u.id, to };
    o.history.push({ at: Date.now(), by: u.id, action: 'Reagendamento proposto', note: new Date(to).toLocaleString('pt-BR') });
    notify(d, other, `Pedido de reagendamento: ${o.title}`, `/pedido/${o.id}`);
  });
}
export function answerReschedule(orderId: string, accept: boolean) {
  commit((d) => {
    const { u, o, other } = party(d, orderId);
    need(o.rescheduleRequest && o.rescheduleRequest.by !== u.id, 'Não há reagendamento para responder.');
    if (accept) o.scheduledAt = o.rescheduleRequest.to;
    o.history.push({ at: Date.now(), by: u.id, action: accept ? 'Reagendamento aceito' : 'Reagendamento recusado' });
    o.rescheduleRequest = undefined;
    notify(d, other, `Reagendamento ${accept ? 'aceito' : 'recusado'}: ${o.title}`, `/pedido/${o.id}`);
  });
}

export function startOrder(orderId: string) {
  commit((d) => {
    const { u, o, role, other } = party(d, orderId);
    need(role === 'pro', 'Apenas o profissional inicia o serviço.');
    need(o.status === 'agendado', 'Agende o serviço antes de iniciar.');
    move(d, o, u.id, 'em_andamento', 'Serviço iniciado');
    notify(d, other, `Serviço em andamento: ${o.title}`, `/pedido/${o.id}`);
  });
}

export function finishOrder(orderId: string) {
  commit((d) => {
    const { u, o, role, other } = party(d, orderId);
    need(role === 'pro', 'Apenas o profissional marca o serviço como concluído.');
    need(o.status === 'em_andamento', 'O serviço precisa estar em andamento.');
    move(d, o, u.id, 'concluido', 'Profissional marcou como concluído');
    notify(d, other, `O profissional concluiu "${o.title}". Confirme e avalie.`, `/pedido/${o.id}`);
  });
}

export function confirmCompletion(orderId: string) {
  commit((d) => {
    const { u, o, role, other } = party(d, orderId);
    need(role === 'client', 'Apenas o cliente confirma a conclusão.');
    need(o.status === 'concluido', 'O profissional ainda não concluiu o serviço.');
    move(d, o, u.id, 'avaliacao_pendente', 'Cliente confirmou a conclusão');
    notify(d, other, `Cliente confirmou a conclusão de "${o.title}"`, `/pedido/${o.id}`);
  });
}

export function closeWithoutReview(orderId: string) {
  commit((d) => {
    const { u, o, role } = party(d, orderId);
    need(role === 'client' && o.status === 'avaliacao_pendente', 'Ação indisponível.');
    move(d, o, u.id, 'encerrado', 'Pedido encerrado sem avaliação');
  });
}

export function cancelOrder(orderId: string, reason: string) {
  const r = clean(reason, 400);
  need(r.length >= 5, 'Informe o motivo do cancelamento.');
  commit((d) => {
    const { u, o, other } = party(d, orderId);
    need(OPEN.includes(o.status), 'Este pedido não pode ser cancelado. Se houver problema, abra uma disputa.');
    o.cancelReason = r;
    move(d, o, u.id, 'cancelado', 'Pedido cancelado', r);
    notify(d, other, `Pedido cancelado: ${o.title}`, `/pedido/${o.id}`);
  });
}

export function openDispute(orderId: string, reason: string) {
  const r = clean(reason, 800);
  need(r.length >= 10, 'Descreva o problema com detalhes.');
  commit((d) => {
    const { u, o, other } = party(d, orderId);
    need(['em_andamento', 'concluido', 'avaliacao_pendente', 'agendado'].includes(o.status), 'Não é possível abrir disputa neste momento.');
    o.disputeReason = r;
    move(d, o, u.id, 'em_disputa', 'Disputa aberta', r);
    notify(d, other, `Uma disputa foi aberta no pedido "${o.title}". A equipe vai analisar.`, `/pedido/${o.id}`);
  });
}

/** Pagamento combinado diretamente: o app apenas registra o que as partes informam. */
export function informPayment(orderId: string, method: string) {
  commit((d) => {
    const { u, o, other } = party(d, orderId);
    need(!['cancelado', 'proposta_aceita'].includes(o.status), 'Ação indisponível.');
    need(clean(method, 60), 'Informe a forma de pagamento.');
    o.paymentMethod = clean(method, 60);
    if (!o.paymentInformedBy.includes(u.id)) o.paymentInformedBy.push(u.id);
    o.history.push({ at: Date.now(), by: u.id, action: 'Pagamento informado', note: `${o.paymentMethod} (informado pelo usuário, não confirmado por provedor)` });
    notify(d, other, `Pagamento informado em "${o.title}"`, `/pedido/${o.id}`);
  });
}

// ---------------------------------------------------------------- mensagens
export function openConversation(proId: string) {
  return commit((d) => {
    const u = me(d);
    const p = d.pros.find((x) => x.id === proId);
    need(p, 'Profissional não encontrado.');
    need(p.userId !== u.id, 'Este é o seu próprio perfil.');
    return ensureConv(d, u.id, proId).id;
  });
}

const sendLog: number[] = [];
export function sendMessage(convId: string, text: string) {
  const t = clean(text, 1500);
  need(t.length > 0, 'Escreva uma mensagem.');
  const now = Date.now();
  while (sendLog.length && now - sendLog[0]! > 30000) sendLog.shift();
  need(sendLog.length < 10, 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.');
  commit((d) => {
    const u = me(d);
    const c = d.conversations.find((x) => x.id === convId);
    need(c && (c.clientId === u.id || c.proUserId === u.id), 'Conversa não encontrada.');
    const other = c.clientId === u.id ? c.proUserId : c.clientId;
    const otherUser = d.users.find((x) => x.id === other);
    need(!otherUser?.blocked.includes(u.id) && !u.blocked.includes(other), 'Não é possível enviar mensagens nesta conversa (usuário bloqueado).');
    d.messages.push({ id: uid('m_'), convId, senderId: u.id, text: t, kind: 'text', at: now, readBy: [u.id] });
    c.lastAt = now;
    const unreadNotif = d.notifications.find((n) => n.userId === other && !n.read && n.link === `/mensagens/${c.id}`);
    if (!unreadNotif) notify(d, other, `Nova mensagem de ${u.name}`, `/mensagens/${c.id}`);
  });
  sendLog.push(now);
}

export function markConversationRead(convId: string) {
  const d = getDB();
  const u = d.users.find((x) => x.id === getSessionId());
  if (!u) return;
  const unread = d.messages.some((m) => m.convId === convId && !m.readBy.includes(u.id));
  if (!unread) return;
  commit((d) => d.messages.filter((m) => m.convId === convId).forEach((m) => !m.readBy.includes(u.id) && m.readBy.push(u.id)));
}

export function toggleBlock(userId: string) {
  commit((d) => {
    const u = me(d);
    need(userId !== u.id, 'Ação inválida.');
    u.blocked = u.blocked.includes(userId) ? u.blocked.filter((x) => x !== userId) : [...u.blocked, userId];
  });
}

// ---------------------------------------------------------------- reputação
export function submitReview(orderId: string, ratings: Ratings, comment: string) {
  commit((d) => {
    const { u, o, role, other } = party(d, orderId);
    need(role === 'client', 'Apenas o cliente do pedido pode avaliar.');
    need(o.status === 'avaliacao_pendente', 'A avaliação fica disponível depois que você confirma a conclusão do serviço.');
    need(!d.reviews.some((r) => r.orderId === o.id), 'Este pedido já foi avaliado.');
    need(Date.now() - u.createdAt > 0, 'Conta inválida.');
    need(Object.values(ratings).every((v) => Number.isInteger(v) && v >= 1 && v <= 5), 'Dê uma nota de 1 a 5 em cada critério.');
    d.reviews.push({ id: uid('v_'), orderId: o.id, proId: o.proId, clientId: u.id, ratings, comment: clean(comment, 1000), status: 'publicada', createdAt: Date.now() });
    move(d, o, u.id, 'encerrado', 'Avaliação publicada');
    notify(d, other, `Você recebeu uma avaliação em "${o.title}"`, `/pedido/${o.id}`);
  });
}

export function replyReview(reviewId: string, text: string) {
  const t = clean(text, 600);
  need(t.length >= 3, 'Escreva sua resposta.');
  commit((d) => {
    const p = myPro(d);
    const r = d.reviews.find((x) => x.id === reviewId);
    need(r && r.proId === p.id, 'Avaliação não encontrada.');
    need(!r.proReply, 'Você já respondeu esta avaliação.');
    r.proReply = t;
  });
}

/** Contestar não remove a avaliação: ela vai para moderação. Pagar nunca remove críticas. */
export function contestReview(reviewId: string, reason: string) {
  const t = clean(reason, 600);
  need(t.length >= 10, 'Explique por que a avaliação deve ser analisada.');
  commit((d) => {
    const p = myPro(d);
    const r = d.reviews.find((x) => x.id === reviewId);
    need(r && r.proId === p.id && r.status === 'publicada', 'Avaliação não encontrada.');
    r.status = 'contestada';
    d.reports.push({ id: uid('rep_'), reporterId: p.userId, targetType: 'avaliacao', targetId: r.id, reason: 'Contestação do profissional', details: t, status: 'aberta', createdAt: Date.now() });
  });
}

export function addReference(proId: string, i: Pick<CommunityReference, 'relation' | 'howKnows' | 'text' | 'showAuthorName' | 'consentPublish'>) {
  commit((d) => {
    const u = me(d);
    const p = d.pros.find((x) => x.id === proId);
    need(p, 'Profissional não encontrado.');
    need(p.userId !== u.id, 'Você não pode recomendar o próprio perfil.');
    need(Date.now() - u.createdAt > 60_000 || u.demo, 'Contas recém-criadas precisam aguardar alguns minutos para recomendar.');
    need(!d.references.some((r) => r.proId === proId && r.authorId === u.id && r.status === 'publicada'), 'Você já recomendou este profissional.');
    need(i.consentPublish, 'É preciso autorizar a publicação da recomendação.');
    need(clean(i.howKnows, 120).length >= 5, 'Conte como você conhece o profissional.');
    need(clean(i.text, 500).length >= 10, 'Escreva sua recomendação.');
    d.references.push({ id: uid('ref_'), proId, authorId: u.id, relation: i.relation, howKnows: clean(i.howKnows, 120), text: clean(i.text, 500), showAuthorName: i.showAuthorName, consentPublish: true, status: 'publicada', createdAt: Date.now() });
    notify(d, p.userId, 'Você recebeu uma Indicação do Bairro!', `/p/${p.slug}`);
  });
}

export function report(targetType: ReportTarget, targetId: string, reason: string, details: string) {
  need(reason, 'Escolha um motivo.');
  commit((d) => {
    const u = me(d);
    need(!d.reports.some((r) => r.reporterId === u.id && r.targetId === targetId && r.status === 'aberta'), 'Você já denunciou este conteúdo. Ele está em análise.');
    d.reports.push({ id: uid('rep_'), reporterId: u.id, targetType, targetId, reason, details: clean(details, 600), status: 'aberta', createdAt: Date.now() });
  });
}

// ---------------------------------------------------------------- notificações
export function markAllNotificationsRead() {
  commit((d) => {
    const u = me(d);
    d.notifications.forEach((n) => n.userId === u.id && (n.read = true));
  });
}

// ---------------------------------------------------------------- administração
export function adminSetUserStatus(userId: string, status: 'active' | 'suspended', reason: string) {
  commit((d) => {
    const a = admin(d, 'users.suspend');
    const u = d.users.find((x) => x.id === userId);
    need(u && u.id !== a.id, 'Usuário inválido.');
    need(status === 'active' || clean(reason, 300).length >= 5, 'Registre o motivo da suspensão.');
    u.status = status;
    u.suspendReason = status === 'suspended' ? clean(reason, 300) : undefined;
    audit(d, a.id, status === 'suspended' ? 'Suspendeu conta' : 'Reativou conta', `usuário ${u.id}`, reason);
  });
}

export function adminResolveReport(reportId: string, upheld: boolean, decision: string) {
  const dec = clean(decision, 500);
  need(dec.length >= 5, 'Registre a decisão de moderação.');
  commit((d) => {
    const a = admin(d, 'reports.moderate');
    const r = d.reports.find((x) => x.id === reportId);
    need(r && r.status === 'aberta', 'Denúncia não encontrada.');
    r.status = upheld ? 'procedente' : 'improcedente';
    r.decision = dec;
    if (r.targetType === 'avaliacao') {
      const rv = d.reviews.find((x) => x.id === r.targetId);
      if (rv) rv.status = upheld ? 'removida' : 'publicada';
    }
    if (upheld) {
      if (r.targetType === 'referencia') d.references.filter((x) => x.id === r.targetId).forEach((x) => (x.status = 'removida'));
      if (r.targetType === 'foto') d.portfolio.filter((x) => x.id === r.targetId).forEach((x) => (x.status = 'recusado'));
      if (r.targetType === 'mensagem') d.messages.filter((x) => x.id === r.targetId).forEach((x) => (x.text = '[mensagem removida pela moderação]'));
      if (r.targetType === 'perfil') d.pros.filter((x) => x.id === r.targetId).forEach((x) => (x.published = false));
    }
    notify(d, r.reporterId, `Sua denúncia foi analisada: ${upheld ? 'procedente' : 'improcedente'}.`, '/notificacoes');
    audit(d, a.id, `Denúncia ${upheld ? 'procedente' : 'improcedente'}`, `${r.targetType} ${r.targetId}`, dec);
  });
}

export function adminModeratePhoto(itemId: string, approve: boolean) {
  commit((d) => {
    const a = admin(d, 'reports.moderate');
    const it = d.portfolio.find((x) => x.id === itemId);
    need(it, 'Item não encontrado.');
    it.status = approve ? 'aprovado' : 'recusado';
    const pu = proUser(d, it.proId);
    if (pu) notify(d, pu, `Foto do portfólio "${it.title}" ${approve ? 'aprovada' : 'recusada pela moderação'}.`, '/perfil/vitrine');
    audit(d, a.id, approve ? 'Aprovou foto' : 'Recusou foto', `portfólio ${it.id}`);
  });
}

export function adminReviewVerification(id: string, approve: boolean, note: string) {
  commit((d) => {
    const a = admin(d, 'verifications.review');
    const v = d.verifications.find((x) => x.id === id);
    need(v && v.status === 'pendente', 'Solicitação não encontrada.');
    need(approve || clean(note, 300).length >= 5, 'Informe o motivo da recusa.');
    v.status = approve ? 'aprovada' : 'recusada';
    v.decisionNote = clean(note, 300);
    const p = d.pros.find((x) => x.id === v.proId);
    if (p) {
      if (v.kind === 'identidade') p.identityVerified = approve;
      else {
        const c = p.credentials.find((x) => x.id === v.credentialId);
        if (c) c.status = approve ? 'verificado' : 'recusado';
      }
      notify(d, p.userId, `Verificação de ${v.kind} ${approve ? 'aprovada' : 'recusada'}.`, '/perfil/vitrine');
    }
    audit(d, a.id, `Verificação ${approve ? 'aprovada' : 'recusada'}`, `${v.kind} ${v.proId}`, note);
  });
}

export function adminResolveDispute(orderId: string, outcome: 'encerrado' | 'cancelado', note: string) {
  const n = clean(note, 500);
  need(n.length >= 5, 'Registre a decisão.');
  commit((d) => {
    const a = admin(d, 'disputes.resolve');
    const o = d.orders.find((x) => x.id === orderId);
    need(o && o.status === 'em_disputa', 'Disputa não encontrada.');
    move(d, o, a.id, outcome, 'Disputa resolvida pela equipe', n);
    notify(d, o.clientId, `Disputa resolvida: ${o.title}`, `/pedido/${o.id}`);
    notify(d, proUser(d, o.proId)!, `Disputa resolvida: ${o.title}`, `/pedido/${o.id}`);
    audit(d, a.id, 'Resolveu disputa', `pedido ${o.id}`, n);
  });
}

export function adminUpsertCategory(id: string | null, name: string, active: boolean) {
  commit((d) => {
    const a = admin(d, 'catalog.manage');
    const n = clean(name, 50);
    need(n.length >= 3, 'Nome inválido.');
    if (id) {
      const c = d.categories.find((x) => x.id === id);
      need(c, 'Categoria não encontrada.');
      c.name = n;
      c.active = active;
    } else d.categories.push({ id: slugify(n), name: n, icon: 'Sparkles', active });
    audit(d, a.id, id ? 'Editou categoria' : 'Criou categoria', n);
  });
}

export function adminAddNeighborhood(city: string, hood: string) {
  commit((d) => {
    const a = admin(d, 'catalog.manage');
    const h = clean(hood, 60);
    need(h.length >= 2, 'Bairro inválido.');
    let r = d.regions.find((x) => x.city === city);
    if (!r) d.regions.push((r = { city: clean(city, 60), neighborhoods: [] }));
    need(!r.neighborhoods.includes(h), 'Bairro já cadastrado.');
    r.neighborhoods.push(h);
    audit(d, a.id, 'Adicionou bairro', `${h} (${r.city})`);
  });
}

export function adminUpdatePlan(id: string, priceMonthly: number, portfolioLimit: number, active: boolean) {
  commit((d) => {
    const a = admin(d, 'plans.manage');
    const p = d.plans.find((x) => x.id === id);
    need(p, 'Plano não encontrado.');
    need(priceMonthly >= 0 && priceMonthly < 1000 && portfolioLimit >= 1 && portfolioLimit <= 200, 'Valores inválidos.');
    need(id !== 'free' || (priceMonthly === 0 && active), 'O plano gratuito deve continuar gratuito e ativo.');
    p.priceMonthly = priceMonthly;
    p.portfolioLimit = portfolioLimit;
    p.active = active;
    audit(d, a.id, 'Alterou plano', p.name, `R$ ${priceMonthly} · ${portfolioLimit} fotos · ${active ? 'ativo' : 'inativo'}`);
  });
}

/** Funções da equipe só podem ser atribuídas pelo administrador geral. */
export function adminSetRole(userId: string, role: User['adminRole'] | null) {
  commit((d) => {
    const a = admin(d, 'users.pii');
    need(a.adminRole === 'super', 'Apenas o administrador geral altera funções.');
    const u = d.users.find((x) => x.id === userId);
    need(u && u.id !== a.id, 'Usuário inválido.');
    u.adminRole = role ?? undefined;
    audit(d, a.id, 'Alterou função administrativa', `usuário ${u.id}`, role ?? 'nenhuma');
  });
}

export function adminLogExport(what: string) {
  commit((d) => {
    const a = admin(d, 'reports.export');
    audit(d, a.id, 'Exportou relatório', what);
  });
}
