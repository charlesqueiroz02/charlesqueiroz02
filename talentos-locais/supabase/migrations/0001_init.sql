-- TalentosLocais — esquema inicial (Supabase / PostgreSQL)
-- Espelha src/types.ts. As regras de autorização ficam AQUI (RLS + funções),
-- e não apenas no front-end.

create extension if not exists pg_trgm;   -- busca textual aproximada

-- ------------------------------------------------------------------ tipos
create type admin_role       as enum ('super', 'moderador', 'suporte');
create type availability     as enum ('hoje', 'semana', 'agenda', 'indisponivel');
create type attend_mode      as enum ('local', 'estabelecimento', 'remoto');
create type request_status   as enum ('aberta', 'contratada', 'cancelada');
create type quote_status     as enum ('enviada', 'aceita', 'recusada', 'alteracao_solicitada', 'substituida');
create type order_status     as enum ('proposta_aceita', 'agendado', 'em_andamento', 'concluido', 'avaliacao_pendente', 'encerrado', 'cancelado', 'em_disputa');
create type moderation       as enum ('pendente', 'aprovado', 'recusado');
create type credential_state as enum ('declarado', 'em_analise', 'verificado', 'recusado');
create type report_target    as enum ('perfil', 'avaliacao', 'mensagem', 'foto', 'referencia', 'usuario');

-- ------------------------------------------------------------------ catálogo
create table categories (
  id text primary key,
  name text not null,
  icon text not null default 'Sparkles',
  active boolean not null default true
);
create table regions (
  id bigserial primary key,
  city text not null,
  neighborhood text not null,
  -- posição aproximada do centro do bairro (nunca de pessoas)
  lat double precision, lng double precision,
  unique (city, neighborhood)
);
create table plans (
  id text primary key,
  name text not null,
  price_monthly numeric(10,2) not null default 0 check (price_monthly >= 0),
  portfolio_limit int not null default 8,
  features text[] not null default '{}',
  active boolean not null default true
);

-- ------------------------------------------------------------------ pessoas
-- Credenciais ficam no auth.users (Supabase Auth). Aqui só o perfil.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  city text not null,
  neighborhood text not null,
  phone text,                         -- privado: nunca exposto por view pública
  phone_verified boolean not null default false,
  is_client boolean not null default true,
  is_pro boolean not null default false,
  admin_role admin_role,              -- só alterável por 'super' (ver policy)
  status text not null default 'active' check (status in ('active', 'suspended')),
  suspend_reason text,
  consent_terms_at timestamptz not null,
  consent_privacy_at timestamptz not null,
  consent_marketing boolean not null default false,
  low_complexity boolean not null default false,
  created_at timestamptz not null default now()
);

create table pro_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null check (char_length(display_name) between 3 and 60),
  photo_path text,                    -- storage: bucket 'avatars'
  categories text[] not null check (cardinality(categories) between 1 and 3),
  bio text not null default '' check (char_length(bio) <= 1200),
  experience_years int not null default 0 check (experience_years between 0 and 70),
  city text not null,
  neighborhoods text[] not null,
  modes attend_mode[] not null,
  availability availability not null default 'semana',
  urgent boolean not null default false,
  identity_verified boolean not null default false,   -- só via verificação aprovada
  contact_verified boolean not null default false,
  plan text not null default 'free' references plans(id),
  sponsored boolean not null default false,
  published boolean not null default true,
  search tsvector generated always as (to_tsvector('portuguese', display_name || ' ' || bio)) stored,
  created_at timestamptz not null default now()
);
create index on pro_profiles using gin (search);
create index on pro_profiles using gin (categories);
create index on pro_profiles using gin (neighborhoods);

create table services (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  name text not null,
  price_from numeric(10,2) check (price_from >= 0),
  unit text
);

create table credentials (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('curso', 'formacao', 'certificacao', 'registro')),
  status credential_state not null default 'declarado'
);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  category text not null references categories(id),
  title text not null,
  description text not null default '',
  approx_date text,                   -- 'AAAA-MM'
  image_path text,                    -- storage: bucket 'portfolio' (privado até aprovação)
  before_image_path text,
  status moderation not null default 'pendente',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ solicitações, orçamentos, pedidos
create table service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id),
  title text not null check (char_length(title) between 5 and 100),
  description text not null,
  category text not null references categories(id),
  details text not null default '',
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 4),
  city text not null,
  neighborhood text not null,
  preferred_date date,
  urgent boolean not null default false,
  invited_pro_ids uuid[] not null default '{}',
  public_board boolean not null default false,
  status request_status not null default 'aberta',
  created_at timestamptz not null default now()
);
create table board_interests (
  request_id uuid references service_requests(id) on delete cascade,
  pro_id uuid references pro_profiles(id) on delete cascade,
  message text not null default '',
  created_at timestamptz not null default now(),
  primary key (request_id, pro_id)
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  pro_id uuid not null references pro_profiles(id),
  description text not null,
  labor numeric(10,2) not null check (labor > 0),
  materials_included boolean not null default false,
  materials_value numeric(10,2) not null default 0 check (materials_value >= 0),
  travel numeric(10,2) not null default 0 check (travel >= 0),
  deadline_days int not null check (deadline_days between 1 and 365),
  valid_until date not null,
  payment_terms text not null default '',
  warranty text not null default '',
  notes text not null default '',
  status quote_status not null default 'enviada',
  change_request text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references service_requests(id),
  quote_id uuid not null unique references quotes(id),
  client_id uuid not null references profiles(id),
  pro_id uuid not null references pro_profiles(id),
  title text not null,
  agreed_value numeric(10,2) not null,
  scheduled_at timestamptz,
  address_shared text,                -- visível só às partes (RLS)
  status order_status not null default 'proposta_aceita',
  payment_method text,
  payment_informed_by uuid[] not null default '{}',   -- informado ≠ confirmado
  reschedule_to timestamptz,
  reschedule_by uuid,
  cancel_reason text,
  dispute_reason text,
  created_at timestamptz not null default now()
);
create table order_events (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  by_user uuid,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

-- Pagamentos: preparado para provedor externo (Pix/cartão). Nunca guarda dados de cartão.
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null,                 -- ex.: 'mercadopago', 'pagarme'
  provider_payment_id text unique,
  amount numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'falhou', 'reembolsado')),
  confirmed_at timestamptz,               -- só preenchido por webhook do provedor
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ comunicação
create table conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id),
  pro_id uuid not null references pro_profiles(id),
  pro_user_id uuid not null references profiles(id),
  request_id uuid references service_requests(id),
  last_at timestamptz not null default now(),
  unique (client_id, pro_id)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),     -- null = mensagem do sistema
  body text not null check (char_length(body) between 1 and 1500),
  kind text not null default 'text' check (kind in ('text', 'system')),
  created_at timestamptz not null default now()
);
create table message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (message_id, user_id)
);
create table blocks (
  user_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  primary key (user_id, blocked_id)
);

-- ------------------------------------------------------------------ reputação
create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id),     -- 1 avaliação por pedido
  pro_id uuid not null references pro_profiles(id),
  client_id uuid references profiles(id) on delete set null,
  quality smallint not null check (quality between 1 and 5),
  punctuality smallint not null check (punctuality between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  agreement smallint not null check (agreement between 1 and 5),
  value smallint not null check (value between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  status text not null default 'publicada' check (status in ('publicada', 'contestada', 'removida')),
  pro_reply text,
  created_at timestamptz not null default now()
);
create table community_references (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  relation text not null check (relation in ('contratou', 'conhece')),
  how_knows text not null,
  body text not null,
  show_author_name boolean not null default false,
  consent_publish boolean not null check (consent_publish),
  status text not null default 'publicada' check (status in ('publicada', 'removida')),
  created_at timestamptz not null default now(),
  unique (pro_id, author_id)
);

-- ------------------------------------------------------------------ confiança e administração
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'aberta' check (status in ('aberta', 'procedente', 'improcedente')),
  decision text,
  created_at timestamptz not null default now()
);
create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  kind text not null check (kind in ('identidade', 'credencial')),
  credential_id uuid references credentials(id) on delete cascade,
  note text not null default '',
  document_path text,                     -- bucket privado 'verifications', acesso só admin
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  decision_note text,
  created_at timestamptz not null default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  link text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create table audit_log (
  id bigserial primary key,
  admin_id uuid references profiles(id),
  action text not null,
  target text not null,
  note text,
  created_at timestamptz not null default now()
);
create table profile_views (
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()   -- sem identificar quem visitou
);
create table declared_income (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles(id) on delete cascade,
  order_id uuid references orders(id),
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ funções auxiliares
create or replace function is_active_user() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active')
$$;
create or replace function admin_has(perm text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case admin_role
      when 'super' then true
      when 'moderador' then perm in ('users.view','users.suspend','reports.moderate','verifications.review','metrics.view')
      when 'suporte' then perm in ('users.view','orders.view','disputes.resolve','metrics.view')
    end
    from profiles where id = auth.uid() and status = 'active'), false)
$$;
create or replace function my_pro_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from pro_profiles where user_id = auth.uid()
$$;

-- Leituras do próprio registro sem passar pelo RLS (evita recursão nas policies)
create or replace function my_admin_role() returns admin_role language sql stable security definer set search_path = public as $$
  select admin_role from profiles where id = auth.uid()
$$;
create or replace function my_status() returns text language sql stable security definer set search_path = public as $$
  select status from profiles where id = auth.uid()
$$;
create or replace function my_identity_verified() returns boolean language sql stable security definer set search_path = public as $$
  select identity_verified from pro_profiles where user_id = auth.uid()
$$;
create or replace function my_plan() returns text language sql stable security definer set search_path = public as $$
  select plan from pro_profiles where user_id = auth.uid()
$$;

-- Visão pública da vitrine: sem telefone, e-mail ou endereço.
create view public_pros with (security_invoker = true) as
  select p.id, p.slug, p.display_name, p.photo_path, p.categories, p.bio, p.experience_years, p.city, p.neighborhoods, p.modes,
         p.availability, p.urgent, p.identity_verified, p.contact_verified, p.sponsored and p.plan = 'pro' as sponsored, p.created_at
  from pro_profiles p join profiles u on u.id = p.user_id
  where p.published and u.status = 'active';

-- ------------------------------------------------------------------ RLS
alter table profiles enable row level security;
alter table pro_profiles enable row level security;
alter table services enable row level security;
alter table credentials enable row level security;
alter table portfolio_items enable row level security;
alter table service_requests enable row level security;
alter table board_interests enable row level security;
alter table quotes enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table payments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table message_reads enable row level security;
alter table blocks enable row level security;
alter table reviews enable row level security;
alter table community_references enable row level security;
alter table reports enable row level security;
alter table verification_requests enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
alter table profile_views enable row level security;
alter table declared_income enable row level security;
alter table categories enable row level security;
alter table regions enable row level security;
alter table plans enable row level security;

-- catálogo: leitura pública, escrita só admin
create policy cat_read on categories for select using (true);
create policy cat_admin on categories for all using (admin_has('catalog.manage')) with check (admin_has('catalog.manage'));
create policy reg_read on regions for select using (true);
create policy reg_admin on regions for all using (admin_has('catalog.manage')) with check (admin_has('catalog.manage'));
create policy plan_read on plans for select using (true);
create policy plan_admin on plans for update using (admin_has('plans.manage'));

-- perfis: cada um vê/edita o seu; admin com permissão vê todos
create policy prof_self on profiles for select using (id = auth.uid() or admin_has('users.view'));
create policy prof_insert on profiles for insert with check (id = auth.uid() and admin_role is null);
create policy prof_update on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and admin_role is not distinct from my_admin_role() and status = my_status());
create policy prof_admin on profiles for update using (admin_has('users.suspend'));

-- vitrine: leitura pública (via view), dono edita; selos só por admin
create policy pro_read on pro_profiles for select using (published or user_id = auth.uid() or admin_has('users.view'));
create policy pro_insert on pro_profiles for insert with check (user_id = auth.uid() and is_active_user() and not identity_verified and plan = 'free');
create policy pro_update on pro_profiles for update using (user_id = auth.uid())
  -- selo de identidade e plano pago não podem ser alterados pelo próprio profissional
  with check (identity_verified = my_identity_verified() and plan = my_plan());
create policy pro_admin on pro_profiles for update using (admin_has('verifications.review') or admin_has('reports.moderate'));

create policy svc_read on services for select using (true);
create policy svc_own on services for all using (pro_id = my_pro_id()) with check (pro_id = my_pro_id());
create policy cred_read on credentials for select using (true);
create policy cred_own on credentials for all using (pro_id = my_pro_id()) with check (pro_id = my_pro_id() and status in ('declarado', 'em_analise'));

create policy pf_read on portfolio_items for select using (status = 'aprovado' or pro_id = my_pro_id() or admin_has('reports.moderate'));
create policy pf_own on portfolio_items for insert with check (pro_id = my_pro_id() and status = 'pendente');
create policy pf_del on portfolio_items for delete using (pro_id = my_pro_id());
create policy pf_mod on portfolio_items for update using (admin_has('reports.moderate'));

-- solicitações: cliente e convidados veem tudo; mural expõe só resumo via view
create policy req_read on service_requests for select using (client_id = auth.uid() or my_pro_id() = any(invited_pro_ids) or admin_has('orders.view'));
create policy req_insert on service_requests for insert with check (client_id = auth.uid() and is_active_user() and status = 'aberta');
create policy req_update on service_requests for update using (client_id = auth.uid());
create view board as
  select id, title, category, city, neighborhood, preferred_date, urgent, created_at
  from service_requests where public_board and status = 'aberta';

create policy bi_read on board_interests for select using (pro_id = my_pro_id() or exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid()));
create policy bi_insert on board_interests for insert with check (
  pro_id = my_pro_id() and exists (select 1 from service_requests r join pro_profiles p on p.id = my_pro_id()
    where r.id = request_id and r.public_board and r.status = 'aberta' and r.category = any(p.categories) and r.client_id <> auth.uid()));

-- orçamentos: só profissional convidado envia; cliente da solicitação lê
create policy q_read on quotes for select using (pro_id = my_pro_id() or exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid()));
create policy q_insert on quotes for insert with check (
  pro_id = my_pro_id() and status = 'enviada'
  and exists (select 1 from service_requests r where r.id = request_id and r.status = 'aberta' and my_pro_id() = any(r.invited_pro_ids)));
-- aceitar/recusar passa pela função accept_quote (transação), não por update direto

-- pedidos: só as partes (e suporte)
create policy o_read on orders for select using (client_id = auth.uid() or pro_id = my_pro_id() or admin_has('orders.view'));
create policy oe_read on order_events for select using (exists (select 1 from orders o where o.id = order_id and (o.client_id = auth.uid() or o.pro_id = my_pro_id() or admin_has('orders.view'))));
create policy pay_read on payments for select using (exists (select 1 from orders o where o.id = order_id and (o.client_id = auth.uid() or o.pro_id = my_pro_id())));
-- payments só é escrito pelo backend (service role) a partir de webhooks do provedor

-- conversas e mensagens
create policy c_read on conversations for select using (client_id = auth.uid() or pro_user_id = auth.uid());
create policy c_insert on conversations for insert with check (client_id = auth.uid() and pro_user_id <> auth.uid());
create policy m_read on messages for select using (exists (select 1 from conversations c where c.id = conversation_id and (c.client_id = auth.uid() or c.pro_user_id = auth.uid())));
create policy m_insert on messages for insert with check (
  sender_id = auth.uid() and kind = 'text' and is_active_user()
  and exists (select 1 from conversations c where c.id = conversation_id and (c.client_id = auth.uid() or c.pro_user_id = auth.uid())
    and not exists (select 1 from blocks b where (b.user_id = c.client_id and b.blocked_id = c.pro_user_id) or (b.user_id = c.pro_user_id and b.blocked_id = c.client_id))));
create policy mr_own on message_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bl_own on blocks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- avaliações: leitura pública; escrita só pela função submit_review (elegibilidade)
create policy rv_read on reviews for select using (status <> 'removida' or admin_has('reports.moderate'));
create policy rv_reply on reviews for update using (pro_id = my_pro_id() and pro_reply is null);

create policy ref_read on community_references for select using (status = 'publicada' or author_id = auth.uid());
create policy ref_insert on community_references for insert with check (
  author_id = auth.uid() and is_active_user() and consent_publish
  and not exists (select 1 from pro_profiles p where p.id = pro_id and p.user_id = auth.uid()));

create policy rp_insert on reports for insert with check (reporter_id = auth.uid());
create policy rp_read on reports for select using (reporter_id = auth.uid() or admin_has('reports.moderate'));
create policy rp_mod on reports for update using (admin_has('reports.moderate'));

create policy vr_own on verification_requests for insert with check (pro_id = my_pro_id() and status = 'pendente');
create policy vr_read on verification_requests for select using (pro_id = my_pro_id() or admin_has('verifications.review'));
create policy vr_mod on verification_requests for update using (admin_has('verifications.review'));

create policy n_own on notifications for select using (user_id = auth.uid());
create policy n_upd on notifications for update using (user_id = auth.uid());
create policy al_read on audit_log for select using (admin_has('audit.view'));
create policy pv_insert on profile_views for insert with check (true);
create policy pv_read on profile_views for select using (pro_id = my_pro_id() or admin_has('metrics.view'));
create policy di_own on declared_income for all using (pro_id = my_pro_id()) with check (pro_id = my_pro_id());

-- ------------------------------------------------------------------ operações transacionais
-- Aceitar orçamento: recusa os demais e cria o pedido numa única transação.
create or replace function accept_quote(p_quote uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare q quotes; r service_requests; oid uuid;
begin
  select * into q from quotes where id = p_quote for update;
  select * into r from service_requests where id = q.request_id for update;
  if r.client_id <> auth.uid() or not is_active_user() then raise exception 'sem permissão'; end if;
  if r.status <> 'aberta' or q.status not in ('enviada', 'alteracao_solicitada') or q.valid_until < current_date then raise exception 'orçamento indisponível'; end if;
  update quotes set status = 'aceita' where id = q.id;
  update quotes set status = 'recusada' where request_id = r.id and id <> q.id and status in ('enviada', 'alteracao_solicitada');
  update service_requests set status = 'contratada' where id = r.id;
  insert into orders (request_id, quote_id, client_id, pro_id, title, agreed_value)
    values (r.id, q.id, r.client_id, q.pro_id, r.title, q.labor + case when q.materials_included then q.materials_value else 0 end + q.travel)
    returning id into oid;
  insert into order_events (order_id, by_user, action) values (oid, auth.uid(), 'Proposta aceita');
  return oid;
end $$;

-- Avaliar: só o cliente, só depois de confirmar a conclusão, uma vez por pedido.
create or replace function submit_review(p_order uuid, q smallint, p smallint, c smallint, a smallint, v smallint, p_comment text) returns uuid
language plpgsql security definer set search_path = public as $$
declare o orders; rid uuid;
begin
  select * into o from orders where id = p_order for update;
  if o.client_id <> auth.uid() or not is_active_user() then raise exception 'sem permissão'; end if;
  if o.status <> 'avaliacao_pendente' then raise exception 'avaliação indisponível'; end if;
  insert into reviews (order_id, pro_id, client_id, quality, punctuality, communication, agreement, value, comment)
    values (o.id, o.pro_id, o.client_id, q, p, c, a, v, left(coalesce(p_comment, ''), 1000)) returning id into rid;
  update orders set status = 'encerrado' where id = o.id;
  insert into order_events (order_id, by_user, action) values (o.id, auth.uid(), 'Avaliação publicada');
  return rid;
end $$;

-- Transições de status do pedido com regra por papel.
create or replace function advance_order(p_order uuid, p_to order_status, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o orders; is_client boolean; is_pro boolean;
begin
  select * into o from orders where id = p_order for update;
  is_client := o.client_id = auth.uid();
  is_pro := o.pro_id = my_pro_id();
  if not (is_client or is_pro) or not is_active_user() then raise exception 'sem permissão'; end if;
  if not (
       (o.status in ('proposta_aceita', 'agendado') and p_to = 'agendado')
    or (is_pro and o.status = 'agendado' and p_to = 'em_andamento')
    or (is_pro and o.status = 'em_andamento' and p_to = 'concluido')
    or (is_client and o.status = 'concluido' and p_to = 'avaliacao_pendente')
    or (is_client and o.status = 'avaliacao_pendente' and p_to = 'encerrado')
    or (o.status in ('proposta_aceita', 'agendado', 'em_andamento') and p_to = 'cancelado' and coalesce(length(p_note), 0) >= 5)
    or (o.status in ('agendado', 'em_andamento', 'concluido', 'avaliacao_pendente') and p_to = 'em_disputa' and coalesce(length(p_note), 0) >= 10)
  ) then raise exception 'transição inválida'; end if;
  update orders set status = p_to,
    cancel_reason = case when p_to = 'cancelado' then p_note else cancel_reason end,
    dispute_reason = case when p_to = 'em_disputa' then p_note else dispute_reason end
  where id = o.id;
  insert into order_events (order_id, by_user, action, note) values (o.id, auth.uid(), p_to::text, p_note);
end $$;

-- Registro automático de auditoria nas tabelas moderadas
create or replace function log_admin_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = auth.uid() and admin_role is not null) then
    insert into audit_log (admin_id, action, target, note) values (auth.uid(), tg_op || ' ' || tg_table_name, coalesce(new.id::text, old.id::text), null);
  end if;
  return coalesce(new, old);
end $$;
create trigger audit_reports after update on reports for each row execute function log_admin_change();
create trigger audit_verifications after update on verification_requests for each row execute function log_admin_change();
create trigger audit_profiles after update of status, admin_role on profiles for each row execute function log_admin_change();
create trigger audit_portfolio after update of status on portfolio_items for each row execute function log_admin_change();

-- ------------------------------------------------------------------ dados iniciais
insert into plans (id, name, price_monthly, portfolio_limit, features) values
  ('free', 'Gratuito', 0, 8, array['Perfil profissional', 'Cadastro de serviços', 'Portfólio básico', 'Solicitações e orçamentos', 'Mensagens', 'Avaliações verificadas']),
  ('pro', 'Profissional', 19.90, 40, array['Portfólio ampliado', 'Estatísticas', 'Gestão de pedidos', 'Destaque patrocinado identificado']);
insert into categories (id, name, icon) values
  ('casa', 'Casa e Reparos', 'Home'), ('solda', 'Soldagem e Metalurgia', 'Flame'), ('auto', 'Automotivo', 'Car'),
  ('costura', 'Costura e Artesanato', 'Scissors'), ('instalacao', 'Instalação e Manutenção', 'Wrench'),
  ('construcao', 'Construção e Reforma', 'BrickWall'), ('tecnologia', 'Tecnologia', 'Laptop'), ('gerais', 'Serviços Gerais', 'Sparkles');
