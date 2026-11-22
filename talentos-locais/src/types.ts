// Entidades do TalentosLocais. Espelham as tabelas de supabase/migrations/0001_init.sql.

export type ID = string;
export type AdminRole = 'super' | 'moderador' | 'suporte';
export type AttendMode = 'local' | 'estabelecimento' | 'remoto';
export type Availability = 'hoje' | 'semana' | 'agenda' | 'indisponivel';

export interface Consent {
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
  at: number;
}

export interface User {
  id: ID;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  city: string;
  neighborhood: string;
  phone?: string;
  phoneVerified: boolean;
  roles: ('client' | 'pro')[];
  adminRole?: AdminRole;
  status: 'active' | 'suspended';
  suspendReason?: string;
  consent: Consent;
  lowComplexity: boolean;
  saved: ID[]; // ids de ProProfile
  blocked: ID[]; // ids de User
  createdAt: number;
  demo?: boolean; // dado fictício de demonstração
}

export interface Service {
  id: ID;
  name: string;
  priceFrom?: number;
  unit?: string; // "por visita", "por hora"...
}

export interface Credential {
  id: ID;
  name: string;
  kind: 'curso' | 'formacao' | 'certificacao' | 'registro';
  status: 'declarado' | 'em_analise' | 'verificado' | 'recusado';
}

export interface ProProfile {
  id: ID;
  userId: ID;
  slug: string;
  displayName: string;
  avatarHue: number;
  photo?: string;
  categories: ID[];
  services: Service[];
  bio: string;
  experienceYears: number;
  city: string;
  neighborhoods: string[];
  modes: AttendMode[];
  availability: Availability;
  urgent: boolean;
  identityVerified: boolean;
  contactVerified: boolean;
  credentials: Credential[];
  plan: 'free' | 'pro';
  sponsored: boolean;
  published: boolean;
  createdAt: number;
  demo?: boolean;
}

export interface PortfolioItem {
  id: ID;
  proId: ID;
  category: ID;
  title: string;
  description: string;
  approxDate: string; // "2025-08"
  image?: string; // dataURL (comprimida)
  beforeImage?: string;
  hue: number;
  status: 'pendente' | 'aprovado' | 'recusado';
  createdAt: number;
}

export interface Ratings {
  quality: number;
  punctuality: number;
  communication: number;
  agreement: number;
  value: number;
}

export interface Review {
  id: ID;
  orderId: ID;
  proId: ID;
  clientId: ID;
  ratings: Ratings;
  comment: string;
  status: 'publicada' | 'contestada' | 'removida';
  proReply?: string;
  createdAt: number;
  demo?: boolean;
}

export interface CommunityReference {
  id: ID;
  proId: ID;
  authorId: ID;
  relation: 'contratou' | 'conhece';
  howKnows: string;
  text: string;
  showAuthorName: boolean;
  consentPublish: boolean;
  status: 'publicada' | 'removida';
  createdAt: number;
  demo?: boolean;
}

export interface ServiceRequest {
  id: ID;
  clientId: ID;
  title: string;
  description: string;
  category: ID;
  details: string; // medidas, quantidades
  photos: string[];
  neighborhood: string;
  city: string;
  preferredDate: string;
  urgent: boolean;
  invitedProIds: ID[];
  publicBoard: boolean; // Mural de Oportunidades
  interests: { proId: ID; message: string; at: number }[];
  status: 'aberta' | 'contratada' | 'cancelada';
  createdAt: number;
  demo?: boolean;
}

export type QuoteStatus = 'enviada' | 'aceita' | 'recusada' | 'alteracao_solicitada' | 'substituida';

export interface Quote {
  id: ID;
  requestId: ID;
  proId: ID;
  description: string;
  labor: number;
  materialsIncluded: boolean;
  materialsValue: number;
  travel: number;
  deadlineDays: number;
  validUntil: string;
  paymentTerms: string;
  warranty: string;
  notes: string;
  status: QuoteStatus;
  changeRequest?: string;
  createdAt: number;
}

export type OrderStatus =
  | 'proposta_aceita'
  | 'agendado'
  | 'em_andamento'
  | 'concluido'
  | 'avaliacao_pendente'
  | 'encerrado'
  | 'cancelado'
  | 'em_disputa';

export interface OrderEvent {
  at: number;
  by: ID;
  action: string;
  note?: string;
}

export interface Order {
  id: ID;
  requestId: ID;
  quoteId: ID;
  clientId: ID;
  proId: ID;
  title: string;
  agreedValue: number;
  scheduledAt?: string; // ISO local
  status: OrderStatus;
  addressShared?: string; // só visível às partes
  paymentMethod?: string;
  paymentInformedBy: ID[]; // quem informou que o pagamento foi feito/recebido
  rescheduleRequest?: { by: ID; to: string };
  cancelReason?: string;
  disputeReason?: string;
  history: OrderEvent[];
  createdAt: number;
  demo?: boolean;
}

export interface Conversation {
  id: ID;
  clientId: ID;
  proUserId: ID;
  proId: ID;
  requestId?: ID;
  lastAt: number;
}

export interface Message {
  id: ID;
  convId: ID;
  senderId: ID;
  text: string;
  kind: 'text' | 'system';
  at: number;
  readBy: ID[];
}

export type ReportTarget = 'perfil' | 'avaliacao' | 'mensagem' | 'foto' | 'referencia' | 'usuario';

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: ReportTarget;
  targetId: ID;
  reason: string;
  details: string;
  status: 'aberta' | 'procedente' | 'improcedente';
  decision?: string;
  createdAt: number;
}

export interface VerificationRequest {
  id: ID;
  proId: ID;
  kind: 'identidade' | 'credencial';
  credentialId?: ID;
  note: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  decisionNote?: string;
  createdAt: number;
}

export interface Notification {
  id: ID;
  userId: ID;
  text: string;
  link: string;
  read: boolean;
  at: number;
}

export interface Plan {
  id: ID;
  name: string;
  priceMonthly: number;
  features: string[];
  portfolioLimit: number;
  active: boolean;
}

export interface Category {
  id: ID;
  name: string;
  icon: string;
  active: boolean;
}

export interface AuditLog {
  id: ID;
  adminId: ID;
  action: string;
  target: string;
  note?: string;
  at: number;
}

export interface ProfileView {
  proId: ID;
  at: number;
}

export interface DeclaredIncome {
  id: ID;
  proId: ID;
  orderId?: ID;
  amount: number;
  at: number;
}

export interface DB {
  version: number;
  users: User[];
  pros: ProProfile[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  references: CommunityReference[];
  requests: ServiceRequest[];
  quotes: Quote[];
  orders: Order[];
  conversations: Conversation[];
  messages: Message[];
  reports: Report[];
  verifications: VerificationRequest[];
  notifications: Notification[];
  plans: Plan[];
  categories: Category[];
  regions: { city: string; neighborhoods: string[] }[];
  audit: AuditLog[];
  views: ProfileView[];
  income: DeclaredIncome[];
  loginAttempts: Record<string, { count: number; lockedUntil: number }>;
  resetCodes: Record<string, { code: string; exp: number }>;
}
