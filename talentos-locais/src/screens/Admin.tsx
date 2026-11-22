import { Download } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Chip, EmptyState, Field, Modal, Notice, PortfolioThumb, TopBar, inputCls, useAction } from '../components/ui';
import {
  adminAddNeighborhood, adminLogExport, adminModeratePhoto, adminResolveDispute, adminResolveReport, adminReviewVerification, adminSetRole,
  adminSetUserStatus, adminUpdatePlan, adminUpsertCategory,
} from '../data/actions';
import { useStore } from '../data/store';
import { ROLE_LABEL, can, type AdminPerm } from '../lib/permissions';
import { go } from '../lib/router';
import { DAY, brl, fmtDateTime, maskEmail } from '../lib/utils';
import type { AdminRole } from '../types';
import { ORDER_LABEL } from './Orders';

type Tab = 'geral' | 'denuncias' | 'fotos' | 'verificacoes' | 'usuarios' | 'pedidos' | 'catalogo' | 'planos' | 'auditoria';
const TABS: [Tab, string, AdminPerm][] = [
  ['geral', 'Visão geral', 'metrics.view'],
  ['denuncias', 'Denúncias', 'reports.moderate'],
  ['fotos', 'Fotos', 'reports.moderate'],
  ['verificacoes', 'Verificações', 'verifications.review'],
  ['usuarios', 'Usuários', 'users.view'],
  ['pedidos', 'Pedidos e disputas', 'orders.view'],
  ['catalogo', 'Categorias e regiões', 'catalog.manage'],
  ['planos', 'Planos', 'plans.manage'],
  ['auditoria', 'Auditoria', 'audit.view'],
];

export function Admin() {
  const { db, me } = useStore();
  const tabs = TABS.filter(([, , p]) => can(me, p));
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? 'geral');
  const openReports = db.reports.filter((r) => r.status === 'aberta').length;
  const pendingPhotos = db.portfolio.filter((p) => p.status === 'pendente').length;
  const pendingVer = db.verifications.filter((v) => v.status === 'pendente').length;
  const counts: Partial<Record<Tab, number>> = { denuncias: openReports, fotos: pendingPhotos, verificacoes: pendingVer, pedidos: db.orders.filter((o) => o.status === 'em_disputa').length };
  return (
    <div>
      <TopBar title="Administração" back="/perfil" right={<Badge tone="violet">{ROLE_LABEL[me!.adminRole!]}</Badge>} />
      <div className="scroll-x flex gap-2 px-4 pt-3">
        {tabs.map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{l}{counts[k] ? ` (${counts[k]})` : ''}</Chip>)}
      </div>
      <div className="space-y-3 px-4 py-4">
        {tab === 'geral' && <Overview />}
        {tab === 'denuncias' && <Reports />}
        {tab === 'fotos' && <Photos />}
        {tab === 'verificacoes' && <Verifications />}
        {tab === 'usuarios' && <Users />}
        {tab === 'pedidos' && <OrdersAdmin />}
        {tab === 'catalogo' && <Catalog />}
        {tab === 'planos' && <PlansAdmin />}
        {tab === 'auditoria' && <Audit />}
      </div>
    </div>
  );
}

function Overview() {
  const { db, me } = useStore();
  const since = Date.now() - 30 * DAY;
  const m: [string, number | string][] = [
    ['Usuários', db.users.filter((u) => u.status === 'active').length],
    ['Profissionais publicados', db.pros.filter((p) => p.published).length],
    ['Solicitações (30 dias)', db.requests.filter((r) => r.createdAt > since).length],
    ['Pedidos criados (30 dias)', db.orders.filter((o) => o.createdAt > since).length],
    ['Pedidos concluídos (total)', db.orders.filter((o) => ['avaliacao_pendente', 'encerrado'].includes(o.status)).length],
    ['Denúncias abertas', db.reports.filter((r) => r.status === 'aberta').length],
    ['Disputas abertas', db.orders.filter((o) => o.status === 'em_disputa').length],
    ['Assinantes Profissional', db.pros.filter((p) => p.plan === 'pro').length],
  ];
  const exportCsv = () => {
    adminLogExport('Indicadores agregados (CSV)');
    const csv = 'indicador;valor\n' + m.map(([k, v]) => `${k};${v}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'indicadores-talentoslocais.csv';
    a.click();
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {m.map(([k, v]) => <Card key={k} className="p-3.5"><p className="text-xs font-semibold text-muted">{k}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></Card>)}
      </div>
      {can(me, 'reports.export') && <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv}>Exportar indicadores (sem dados pessoais)</Button>}
    </>
  );
}

function Decide({ label, onDecide, needNote = true, approveLabel = 'Procedente', rejectLabel = 'Improcedente' }: { label: string; onDecide: (ok: boolean, note: string) => void; needNote?: boolean; approveLabel?: string; rejectLabel?: string }) {
  const [note, setNote] = useState('');
  return (
    <div className="mt-3 space-y-2">
      {needNote && <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={label} />}
      <div className="flex gap-2">
        <Button size="sm" variant="dark" onClick={() => onDecide(true, note)}>{approveLabel}</Button>
        <Button size="sm" variant="secondary" onClick={() => onDecide(false, note)}>{rejectLabel}</Button>
      </div>
    </div>
  );
}

function Reports() {
  const { db } = useStore();
  const { run } = useAction();
  const [show, setShow] = useState<'aberta' | 'todas'>('aberta');
  const list = db.reports.filter((r) => show === 'todas' || r.status === 'aberta').sort((a, b) => b.createdAt - a.createdAt);
  const preview = (type: string, id: string) => {
    if (type === 'avaliacao') return db.reviews.find((x) => x.id === id)?.comment;
    if (type === 'referencia') return db.references.find((x) => x.id === id)?.text;
    if (type === 'mensagem') return db.messages.find((x) => x.id === id)?.text;
    if (type === 'perfil') return db.pros.find((x) => x.id === id)?.displayName;
    if (type === 'foto') return db.portfolio.find((x) => x.id === id)?.title;
    if (type === 'usuario') return db.users.find((x) => x.id === id)?.name;
  };
  return (
    <>
      <div className="flex gap-2"><Chip active={show === 'aberta'} onClick={() => setShow('aberta')}>Abertas</Chip><Chip active={show === 'todas'} onClick={() => setShow('todas')}>Todas</Chip></div>
      {!list.length && <EmptyState title="Nenhuma denúncia" />}
      {list.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between gap-2"><Badge tone="red">{r.targetType}</Badge><span className="text-xs text-muted">{fmtDateTime(r.createdAt)}</span></div>
          <p className="mt-2 font-semibold">{r.reason}</p>
          {r.details && <p className="text-sm text-muted">{r.details}</p>}
          <p className="mt-2 rounded-lg bg-stone-50 p-2 text-sm">Conteúdo: "{preview(r.targetType, r.targetId) ?? 'removido'}"</p>
          {r.status === 'aberta' ? (
            <Decide label="Registre a decisão (obrigatório)" onDecide={(ok, note) => run(() => adminResolveReport(r.id, ok, note), 'Decisão registrada')} />
          ) : <p className="mt-2 text-sm"><Badge tone={r.status === 'procedente' ? 'red' : 'neutral'}>{r.status}</Badge> {r.decision}</p>}
        </Card>
      ))}
      <Notice>Avaliações contestadas por profissionais aparecem aqui. Só são removidas se violarem as políticas — nunca por pagamento.</Notice>
    </>
  );
}

function Photos() {
  const { db } = useStore();
  const { run } = useAction();
  const list = db.portfolio.filter((p) => p.status === 'pendente');
  if (!list.length) return <EmptyState title="Nenhuma foto aguardando moderação" />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5">
            {p.beforeImage && <PortfolioThumb image={p.beforeImage} hue={p.hue} title="antes" className="aspect-square w-full" />}
            <PortfolioThumb image={p.image} hue={p.hue} title={p.title} className={p.beforeImage ? 'aspect-square w-full' : 'col-span-2 aspect-square w-full'} />
          </div>
          <div className="p-2.5">
            <p className="text-sm font-semibold">{p.title}</p>
            <p className="text-xs text-muted">{db.pros.find((x) => x.id === p.proId)?.displayName}</p>
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" onClick={() => run(() => adminModeratePhoto(p.id, true), 'Aprovada')}>Aprovar</Button>
              <Button size="sm" variant="danger" onClick={() => run(() => adminModeratePhoto(p.id, false), 'Recusada')}>Recusar</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Verifications() {
  const { db } = useStore();
  const { run } = useAction();
  const list = db.verifications.filter((v) => v.status === 'pendente');
  if (!list.length) return <EmptyState title="Nenhuma verificação pendente" />;
  return (
    <>
      <Notice tone="warn">Aprove somente após conferir o documento por canal seguro (fora deste protótipo). A aprovação gera um selo público.</Notice>
      {list.map((v) => {
        const p = db.pros.find((x) => x.id === v.proId);
        const c = p?.credentials.find((x) => x.id === v.credentialId);
        return (
          <Card key={v.id} className="p-4">
            <Badge tone="blue">{v.kind === 'identidade' ? 'Identidade' : 'Credencial'}</Badge>
            <p className="mt-2 font-semibold">{p?.displayName}</p>
            {c && <p className="text-sm">{c.name}</p>}
            {v.note && <p className="text-sm text-muted">{v.note}</p>}
            <Decide label="Observação (obrigatória para recusar)" approveLabel="Aprovar" rejectLabel="Recusar" onDecide={(ok, note) => run(() => adminReviewVerification(v.id, ok, note), 'Decisão registrada')} />
          </Card>
        );
      })}
    </>
  );
}

function Users() {
  const { db, me } = useStore();
  const { run } = useAction();
  const [q, setQ] = useState('');
  const [suspend, setSuspend] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const pii = can(me, 'users.pii');
  const list = db.users.filter((u) => u.roles.length && (!q || u.name.toLowerCase().includes(q.toLowerCase()) || (pii && u.email.includes(q.toLowerCase())))).slice(0, 50);
  return (
    <>
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" />
      {!pii && <p className="text-xs text-muted">Sua função não tem acesso a e-mails e telefones completos.</p>}
      {list.map((u) => {
        const pro = db.pros.find((p) => p.userId === u.id);
        return (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{u.name} {u.demo && <Badge tone="amber">fictício</Badge>}</p>
                <p className="truncate text-xs text-muted">{pii ? u.email : maskEmail(u.email)} · {u.roles.join(', ')}{u.adminRole && ` · ${ROLE_LABEL[u.adminRole]}`}</p>
              </div>
              <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? 'Ativo' : 'Suspenso'}</Badge>
            </div>
            {u.suspendReason && <p className="mt-1 text-xs text-red-700">{u.suspendReason}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {pro && <Button size="sm" variant="secondary" onClick={() => go(`/p/${pro.slug}`)}>Ver vitrine</Button>}
              {u.id !== me!.id && can(me, 'users.suspend') && (u.status === 'active'
                ? <Button size="sm" variant="danger" onClick={() => { setSuspend(u.id); setReason(''); }}>Suspender</Button>
                : <Button size="sm" onClick={() => run(() => adminSetUserStatus(u.id, 'active', ''), 'Conta reativada')}>Reativar</Button>)}
              {me!.adminRole === 'super' && u.id !== me!.id && (
                <select className="h-9 rounded-xl border border-line bg-white px-2 text-sm" value={u.adminRole ?? ''} onChange={(e) => run(() => adminSetRole(u.id, (e.target.value || null) as AdminRole | null), 'Função atualizada')} aria-label="Função administrativa">
                  <option value="">Sem função admin</option>
                  {(Object.keys(ROLE_LABEL) as AdminRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              )}
            </div>
          </Card>
        );
      })}
      <Modal open={!!suspend} onClose={() => setSuspend(null)} title="Suspender conta">
        <Field label="Motivo (será mostrado ao usuário e registrado na auditoria)"><textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Button variant="danger" className="mt-3 w-full" onClick={async () => { const ok = await run(() => { adminSetUserStatus(suspend!, 'suspended', reason); return true; }, 'Conta suspensa'); if (ok) setSuspend(null); }}>Suspender</Button>
      </Modal>
    </>
  );
}

function OrdersAdmin() {
  const { db, me } = useStore();
  const { run } = useAction();
  const disputes = db.orders.filter((o) => o.status === 'em_disputa');
  const recent = db.orders.filter((o) => o.status !== 'em_disputa').sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);
  return (
    <>
      <h2 className="font-bold">Disputas ({disputes.length})</h2>
      {!disputes.length && <p className="text-sm text-muted">Nenhuma disputa aberta.</p>}
      {disputes.map((o) => (
        <Card key={o.id} className="p-4">
          <p className="font-semibold">{o.title} · {brl(o.agreedValue)}</p>
          <p className="mt-1 text-sm">Motivo: {o.disputeReason}</p>
          <ol className="mt-2 space-y-1 text-xs text-muted">{o.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.action}{h.note && `: ${h.note}`}</li>)}</ol>
          {can(me, 'disputes.resolve') && <Decide label="Decisão (obrigatória)" approveLabel="Encerrar pedido" rejectLabel="Cancelar pedido" onDecide={(ok, note) => run(() => adminResolveDispute(o.id, ok ? 'encerrado' : 'cancelado', note), 'Disputa resolvida')} />}
        </Card>
      ))}
      <h2 className="mt-4 font-bold">Pedidos recentes</h2>
      {recent.map((o) => (
        <div key={o.id} className="flex items-center justify-between gap-2 border-b border-line py-2 text-sm">
          <span className="truncate">{o.title}</span>
          <Badge>{ORDER_LABEL[o.status]}</Badge>
        </div>
      ))}
    </>
  );
}

function Catalog() {
  const { db } = useStore();
  const { run } = useAction();
  const [name, setName] = useState('');
  const [hood, setHood] = useState('');
  const [city, setCity] = useState(db.regions[0]?.city ?? '');
  return (
    <>
      <h2 className="font-bold">Categorias</h2>
      {db.categories.map((c) => (
        <div key={c.id} className="flex items-center justify-between border-b border-line py-2">
          <span className={c.active ? '' : 'text-muted line-through'}>{c.name}</span>
          <Button size="sm" variant="secondary" onClick={() => run(() => adminUpsertCategory(c.id, c.name, !c.active), 'Categoria atualizada')}>{c.active ? 'Desativar' : 'Ativar'}</Button>
        </div>
      ))}
      <div className="flex gap-2"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" /><Button onClick={async () => { const ok = await run(() => { adminUpsertCategory(null, name, true); return true; }, 'Categoria criada'); if (ok) setName(''); }}>Criar</Button></div>
      <h2 className="mt-5 font-bold">Regiões atendidas</h2>
      {db.regions.map((r) => <p key={r.city} className="text-sm"><b>{r.city}:</b> {r.neighborhoods.join(', ')}</p>)}
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
        <input className={inputCls} value={hood} onChange={(e) => setHood(e.target.value)} placeholder="Bairro" />
      </div>
      <Button variant="secondary" onClick={async () => { const ok = await run(() => { adminAddNeighborhood(city, hood); return true; }, 'Bairro adicionado'); if (ok) setHood(''); }}>Adicionar bairro</Button>
    </>
  );
}

function PlansAdmin() {
  const { db } = useStore();
  const { run } = useAction();
  return (
    <>
      {db.plans.map((p) => <PlanRow key={p.id} id={p.id} name={p.name} price={p.priceMonthly} limit={p.portfolioLimit} active={p.active} onSave={(price, limit, active) => run(() => adminUpdatePlan(p.id, price, limit, active), 'Plano atualizado')} />)}
      <Notice>Regra do produto: nenhum plano garante avaliações, remove críticas ou concede verificação. Sem comissão obrigatória por contratação.</Notice>
    </>
  );
}
function PlanRow({ name, price, limit, active, onSave }: { id: string; name: string; price: number; limit: number; active: boolean; onSave: (p: number, l: number, a: boolean) => void }) {
  const [p, setP] = useState(String(price));
  const [l, setL] = useState(String(limit));
  const [a, setA] = useState(active);
  return (
    <Card className="space-y-3 p-4">
      <p className="font-bold">{name}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Preço mensal (R$)"><input type="number" className={inputCls} value={p} onChange={(e) => setP(e.target.value)} /></Field>
        <Field label="Limite do portfólio"><input type="number" className={inputCls} value={l} onChange={(e) => setL(e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-lime-600" checked={a} onChange={(e) => setA(e.target.checked)} /> Ativo</label>
      <Button size="sm" onClick={() => onSave(Number(p), Number(l), a)}>Salvar</Button>
    </Card>
  );
}

function Audit() {
  const { db } = useStore();
  if (!db.audit.length) return <EmptyState title="Nenhuma ação administrativa registrada" />;
  return (
    <ul className="divide-y divide-line">
      {db.audit.map((a) => (
        <li key={a.id} className="py-2.5 text-sm">
          <p><b>{a.action}</b> — {a.target}</p>
          {a.note && <p className="text-muted">{a.note}</p>}
          <p className="text-xs text-muted">{db.users.find((u) => u.id === a.adminId)?.name} · {fmtDateTime(a.at)}</p>
        </li>
      ))}
    </ul>
  );
}
