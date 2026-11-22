// DADOS FICTÍCIOS DE DEMONSTRAÇÃO.
// Todas as pessoas, avaliações e pedidos abaixo são inventados e aparecem no app
// com o selo "Fictício". Nenhum selo de verificação aqui representa verificação real.
import { hashPassword, newSalt } from '../lib/crypto';
import { DAY, uid } from '../lib/utils';
import type { DB, Order, ProProfile, Review, User } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_REGIONS, DEMO_CITY } from './catalog';

export const DB_VERSION = 3;
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ACCOUNTS = {
  cliente: 'cliente@demo.talentoslocais.app',
  profissional: 'profissional@demo.talentoslocais.app',
  admin: 'admin@demo.talentoslocais.app',
};

type ProSeed = {
  name: string;
  cats: string[];
  bio: string;
  years: number;
  hoods: string[];
  modes: ProProfile['modes'];
  avail: ProProfile['availability'];
  urgent: boolean;
  services: [string, number | undefined, string?][];
  portfolio: [string, string, string][]; // categoria, título, descrição
  ageDays: number;
  reviews: [number, string][]; // nota média, comentário
  idVerified?: boolean;
  plan?: 'pro';
  sponsored?: boolean;
};

const PROS: ProSeed[] = [
  {
    name: 'Serralheria Aço Firme', cats: ['solda'], years: 14, hoods: ['Vila Industrial', 'Centro', 'Botafogo'], modes: ['local', 'estabelecimento'], avail: 'semana', urgent: true,
    bio: 'Serralheria familiar. Faço portões, grades, corrimãos e pequenas estruturas metálicas. Conserto de portão basculante e de correr, soldagem no local quando possível.',
    services: [['Conserto de portão', 120, 'por visita'], ['Grade de janela sob medida', 380], ['Pequena estrutura metálica / cobertura', 900]],
    portfolio: [['solda', 'Portão de correr refeito', 'Troca de trilho e roldanas, solda de reforço e pintura.'], ['solda', 'Grade de proteção', 'Grade para janela de 1,20 m com pintura eletrostática.'], ['solda', 'Cobertura metálica', 'Estrutura de 3x4 m para garagem, com telha térmica.']],
    ageDays: 900, reviews: [[4.8, 'Consertou o portão no mesmo dia e explicou o que estava errado.'], [4.4, 'Bom trabalho, atrasou um pouco por causa da chuva mas avisou.'], [5, 'Grade ficou perfeita.']], idVerified: true, plan: 'pro', sponsored: true,
  },
  {
    name: 'Rita Costuras', cats: ['costura'], years: 22, hoods: ['Cambuí', 'Centro', 'Taquaral'], modes: ['estabelecimento'], avail: 'hoje', urgent: true,
    bio: 'Ajustes de roupas, barras, troca de zíper, reforma de vestidos de festa. Atendo no meu ateliê, com hora marcada. Entrega rápida para ajustes simples.',
    services: [['Barra de calça', 25], ['Ajuste de vestido', 80], ['Troca de zíper', 35]],
    portfolio: [['costura', 'Ajuste de vestido de madrinha', 'Ajuste de cintura e barra com renda.'], ['costura', 'Reforma de blazer', 'Ajuste de ombros e mangas.']],
    ageDays: 700, reviews: [[5, 'Ajustou meu vestido em dois dias. Caprichosa!'], [4.6, 'Preço justo e atendimento muito educado.']], idVerified: true,
  },
  {
    name: 'Oficina do Marcos', cats: ['auto'], years: 18, hoods: ['Jardim Proença', 'Vila Industrial'], modes: ['estabelecimento'], avail: 'semana', urgent: false,
    bio: 'Mecânica geral de carros e motos: diagnóstico de barulhos, freios, suspensão e revisão. Mostro a peça trocada e passo orçamento antes de mexer.',
    services: [['Diagnóstico de barulho / avaliação', 80], ['Troca de pastilhas de freio', 150], ['Revisão de moto', 180]],
    portfolio: [['auto', 'Suspensão dianteira', 'Troca de buchas e amortecedores.']],
    ageDays: 1200, reviews: [[4.2, 'Resolveu o barulho na suspensão. Demorou um pouco para entregar.'], [4.7, 'Honesto, mostrou a peça velha.'], [3.8, 'Serviço bom, mas o orçamento subiu durante o conserto.'], [4.9, 'Recomendo.']],
  },
  {
    name: 'Luz Certa Elétrica', cats: ['casa', 'instalacao'], years: 9, hoods: ['Taquaral', 'Cambuí', 'Castelo', 'Barão Geraldo'], modes: ['local'], avail: 'hoje', urgent: true,
    bio: 'Eletricista residencial: troca de disjuntores, instalação de chuveiro, tomadas, luminárias e revisão de fiação. Atendo urgências no mesmo dia.',
    services: [['Visita técnica', 90, 'por visita'], ['Instalação de chuveiro', 120], ['Troca de quadro de disjuntores', 450]],
    portfolio: [['casa', 'Quadro de disjuntores novo', 'Substituição de quadro antigo com identificação dos circuitos.'], ['casa', 'Iluminação de sala', 'Instalação de spots e fita de LED.']],
    ageDays: 500, reviews: [[4.9, 'Atendeu no mesmo dia, muito organizado.'], [4.5, 'Pontual e cuidadoso.']],
  },
  {
    name: 'Bia Faz Reparos', cats: ['casa', 'gerais'], years: 3, hoods: ['Botafogo', 'Castelo', 'Centro'], modes: ['local'], avail: 'semana', urgent: false,
    bio: 'Pequenos reparos e montagem de móveis: prateleiras, cortinas, torneiras, fechaduras. Comecei agora na plataforma, trabalho com cuidado e limpeza.',
    services: [['Montagem de móveis', 70, 'por peça'], ['Instalação de prateleira/cortina', 60], ['Troca de torneira ou fechadura', 70]],
    portfolio: [['casa', 'Montagem de guarda-roupa', 'Guarda-roupa de 6 portas montado e nivelado.'], ['casa', 'Prateleiras de cozinha', 'Três prateleiras com bucha para drywall.'], ['casa', 'Troca de torneira', 'Torneira de parede com troca de vedação.']],
    ageDays: 25, reviews: [],
  },
  {
    name: 'Refrigeração Polar', cats: ['instalacao'], years: 11, hoods: ['Barão Geraldo', 'Taquaral', 'Sousas'], modes: ['local'], avail: 'agenda', urgent: false,
    bio: 'Instalação e manutenção de ar-condicionado split, geladeiras e máquinas de lavar. Limpeza preventiva e carga de gás.',
    services: [['Limpeza de ar-condicionado', 180], ['Instalação de split', 550], ['Conserto de máquina de lavar', 120, 'diagnóstico']],
    portfolio: [['instalacao', 'Instalação de split 12.000 BTUs', 'Tubulação embutida e dreno.']],
    ageDays: 800, reviews: [[4.6, 'Instalação limpa, sem bagunça.'], [4.0, 'Bom, mas só tinha agenda para 2 semanas depois.']],
  },
  {
    name: 'Construtora Mão na Massa (Seu Jorge)', cats: ['construcao'], years: 25, hoods: ['Ouro Verde', 'Vila Industrial', 'Jardim Proença'], modes: ['local'], avail: 'agenda', urgent: false,
    bio: 'Pedreiro e pintor. Reformas de banheiro e cozinha, assentamento de piso, reboco, muro e pintura. Trabalho com ajudante.',
    services: [['Pintura de cômodo', 400, 'por cômodo'], ['Assentamento de piso', 45, 'por m²'], ['Reforma de banheiro', undefined]],
    portfolio: [['construcao', 'Banheiro reformado', 'Troca de revestimento e louças.'], ['construcao', 'Muro de divisa', 'Muro de 12 m com reboco.']],
    ageDays: 1500, reviews: [[4.7, 'Caprichoso, deixou tudo limpo.']],
  },
  {
    name: 'Téo Informática', cats: ['tecnologia'], years: 6, hoods: ['Cambuí', 'Barão Geraldo'], modes: ['local', 'remoto'], avail: 'hoje', urgent: true,
    bio: 'Formatação e manutenção de computadores, configuração de Wi-Fi e impressoras, ajuda remota para quem tem dificuldade com tecnologia.',
    services: [['Suporte remoto (1 h)', 60, 'por hora'], ['Formatação com backup', 150], ['Configuração de rede Wi-Fi', 100]],
    portfolio: [],
    ageDays: 60, reviews: [[4.8, 'Explicou tudo com paciência para minha mãe.']],
  },
  {
    name: 'Jardim Vivo', cats: ['gerais'], years: 7, hoods: ['Sousas', 'Taquaral', 'Barão Geraldo'], modes: ['local'], avail: 'semana', urgent: false,
    bio: 'Jardinagem, poda, corte de grama e limpeza de quintal. Atendimento quinzenal ou avulso.',
    services: [['Corte de grama', 90], ['Poda de árvores pequenas', 150], ['Manutenção quinzenal', 220, 'por mês']],
    portfolio: [['gerais', 'Jardim revitalizado', 'Replantio e cobertura com casca de pinus.']],
    ageDays: 300, reviews: [],
  },
];

const FAKE_CLIENT_NAMES = ['Ana P. (fictícia)', 'Carlos M. (fictício)', 'Dona Lurdes (fictícia)', 'Rafael S. (fictício)'];

export async function buildSeed(): Promise<DB> {
  const now = Date.now();
  const salt = newSalt();
  const hash = await hashPassword(DEMO_PASSWORD, salt);
  const consent = { terms: true, privacy: true, marketing: false, at: now };
  const mkUser = (p: Partial<User> & Pick<User, 'name' | 'email'>): User => ({
    id: uid('u_'), passwordHash: hash, salt, city: DEMO_CITY, neighborhood: 'Centro', phoneVerified: false,
    roles: ['client'], status: 'active', consent, lowComplexity: false, saved: [], blocked: [], createdAt: now - 200 * DAY, demo: true, ...p,
  });

  const db: DB = {
    version: DB_VERSION, users: [], pros: [], portfolio: [], reviews: [], references: [], requests: [], quotes: [], orders: [],
    conversations: [], messages: [], reports: [], verifications: [], notifications: [],
    plans: [
      { id: 'free', name: 'Gratuito', priceMonthly: 0, portfolioLimit: 8, active: true, features: ['Perfil profissional e vitrine', 'Cadastro de serviços', 'Portfólio básico (até 8 fotos)', 'Solicitações e orçamentos', 'Mensagens com clientes', 'Avaliações verificadas'] },
      { id: 'pro', name: 'Profissional', priceMonthly: 19.9, portfolioLimit: 40, active: true, features: ['Tudo do gratuito', 'Portfólio ampliado (até 40 fotos)', 'Estatísticas de visualizações e procura', 'Ferramentas de gestão de pedidos', 'Opção de destaque patrocinado (identificado)'] },
    ],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    regions: DEFAULT_REGIONS.map((r) => ({ ...r, neighborhoods: [...r.neighborhoods] })),
    audit: [], views: [], income: [], loginAttempts: {}, resetCodes: {},
  };

  const client = mkUser({ name: 'Cliente Demonstração', email: DEMO_ACCOUNTS.cliente, neighborhood: 'Cambuí' });
  const admin = mkUser({ name: 'Admin Demonstração', email: DEMO_ACCOUNTS.admin, adminRole: 'super' });
  const fakeClients = FAKE_CLIENT_NAMES.map((name, i) => mkUser({ name, email: `vizinho${i}@demo.talentoslocais.app` }));
  db.users.push(client, admin, ...fakeClients);

  PROS.forEach((s, i) => {
    const u = mkUser({ name: s.name, email: i === 4 ? DEMO_ACCOUNTS.profissional : `pro${i}@demo.talentoslocais.app`, roles: ['client', 'pro'], neighborhood: s.hoods[0]!, phoneVerified: true, createdAt: now - s.ageDays * DAY });
    const pro: ProProfile = {
      id: uid('p_'), userId: u.id, slug: `${s.name.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}-${i}`,
      displayName: s.name, avatarHue: (i * 47 + 120) % 360, categories: s.cats,
      services: s.services.map(([name, priceFrom, unit]) => ({ id: uid('s_'), name, priceFrom, unit })),
      bio: s.bio, experienceYears: s.years, city: DEMO_CITY, neighborhoods: s.hoods, modes: s.modes, availability: s.avail, urgent: s.urgent,
      identityVerified: !!s.idVerified, contactVerified: true,
      credentials: i === 3 ? [{ id: uid('c_'), name: 'Curso de Eletricista Instalador (declarado)', kind: 'curso', status: 'declarado' }] : i === 0 ? [{ id: uid('c_'), name: 'Curso de Soldagem MIG/MAG', kind: 'curso', status: 'declarado' }] : [],
      plan: s.plan ?? 'free', sponsored: !!s.sponsored, published: true, createdAt: now - s.ageDays * DAY, demo: true,
    };
    db.users.push(u);
    db.pros.push(pro);
    s.portfolio.forEach(([category, title, description], k) =>
      db.portfolio.push({ id: uid('f_'), proId: pro.id, category, title, description, approxDate: new Date(now - (k + 1) * 60 * DAY).toISOString().slice(0, 7), hue: (pro.avatarHue + k * 30) % 360, status: 'aprovado', createdAt: now - (k + 1) * 60 * DAY }),
    );
    // Pedidos e avaliações FICTÍCIOS, vinculados a pedidos encerrados (regra de elegibilidade).
    s.reviews.forEach(([score, comment], k) => {
      const c = fakeClients[k % fakeClients.length]!;
      const at = now - (k + 2) * 25 * DAY;
      const reqId = uid('r_');
      const order: Order = {
        id: uid('o_'), requestId: reqId, quoteId: uid('q_'), clientId: c.id, proId: pro.id, title: s.services[k % s.services.length]![0],
        agreedValue: s.services[k % s.services.length]![1] ?? 300, status: 'encerrado', paymentInformedBy: [c.id, u.id], paymentMethod: 'Pix (combinado diretamente)',
        history: [{ at, by: c.id, action: 'Pedido encerrado' }], createdAt: at, demo: true,
      };
      db.orders.push(order);
      db.requests.push({ id: reqId, clientId: c.id, title: order.title, description: '(fictício)', category: s.cats[0]!, details: '', photos: [], neighborhood: s.hoods[0]!, city: DEMO_CITY, preferredDate: '', urgent: false, invitedProIds: [pro.id], publicBoard: false, interests: [], status: 'contratada', createdAt: at, demo: true });
      const jitter = (d: number) => Math.max(1, Math.min(5, Math.round(score + d)));
      const rv: Review = { id: uid('v_'), orderId: order.id, proId: pro.id, clientId: c.id, ratings: { quality: jitter(0.2), punctuality: jitter(-0.3), communication: jitter(0), agreement: jitter(0.1), value: jitter(-0.1) }, comment, status: 'publicada', createdAt: at, demo: true };
      db.reviews.push(rv);
    });
    for (let d = 0; d < 30; d++) {
      const n = Math.floor(((i + 3) * (d + 5)) % 7);
      for (let v = 0; v < n; v++) db.views.push({ proId: pro.id, at: now - d * DAY - v * 3600000 });
    }
  });

  // Referências comunitárias fictícias (com origem transparente)
  const [p0, p1, , p3] = db.pros;
  db.references.push(
    { id: uid('ref_'), proId: p0!.id, authorId: fakeClients[2]!.id, relation: 'conhece', howKnows: 'Vizinho de rua há 10 anos', text: 'Pessoa séria e trabalhadora, sempre vejo a oficina cheia.', showAuthorName: true, consentPublish: true, status: 'publicada', createdAt: now - 40 * DAY, demo: true },
    { id: uid('ref_'), proId: p1!.id, authorId: fakeClients[1]!.id, relation: 'contratou', howKnows: 'Fez ajustes no terno do meu casamento', text: 'Atendimento atencioso, recomendo.', showAuthorName: false, consentPublish: true, status: 'publicada', createdAt: now - 70 * DAY, demo: true },
    { id: uid('ref_'), proId: p3!.id, authorId: fakeClients[3]!.id, relation: 'conhece', howKnows: 'Frequentamos a mesma associação de bairro', text: 'Conheço o trabalho dele pela associação.', showAuthorName: true, consentPublish: true, status: 'publicada', createdAt: now - 15 * DAY, demo: true },
  );

  // Uma oportunidade fictícia no Mural
  db.requests.push({
    id: uid('r_'), clientId: fakeClients[0]!.id, title: 'Instalar cobertura metálica na garagem', description: 'Garagem de aproximadamente 3 x 5 m. Gostaria de telha térmica.', category: 'solda', details: '3 x 5 m', photos: [],
    neighborhood: 'Botafogo', city: DEMO_CITY, preferredDate: new Date(now + 7 * DAY).toISOString().slice(0, 10), urgent: false, invitedProIds: [], publicBoard: true, interests: [], status: 'aberta', createdAt: now - 2 * DAY, demo: true,
  });
  return db;
}
