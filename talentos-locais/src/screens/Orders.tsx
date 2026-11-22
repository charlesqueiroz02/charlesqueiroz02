import { CalendarClock, Check as CheckIcon, ClipboardList, FileText, MessageCircle, Scale, Star } from 'lucide-react';
import { useState } from 'react';
import { Check } from './Auth';
import {
  Avatar, Badge, Button, Card, DemoTag, EmptyState, Field, Modal, Notice, RatingInput, TopBar, inputCls, useAction,
} from '../components/ui';
import {
  acceptQuote, answerReschedule, cancelOrder, cancelRequest, closeWithoutReview, confirmCompletion, declineQuote, finishOrder,
  informPayment, inviteToRequest, openConversation, openDispute, quoteTotal, requestQuoteChange, requestReschedule, scheduleOrder, sendQuote,
  startOrder, submitReview, type QuoteInput,
} from '../data/actions';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { DAY, brl, cx, fmtDate, fmtDateTime, timeAgo } from '../lib/utils';
import type { DB, Order, OrderStatus, Quote, Ratings, ServiceRequest, User } from '../types';

// ---------------------------------------------------------------- status
export const ORDER_LABEL: Record<OrderStatus, string> = {
  proposta_aceita: 'Proposta aceita',
  agendado: 'Serviço agendado',
  em_andamento: 'Serviço em andamento',
  concluido: 'Serviço concluído',
  avaliacao_pendente: 'Avaliação pendente',
  encerrado: 'Pedido encerrado',
  cancelado: 'Cancelado',
  em_disputa: 'Em disputa',
};
const FLOW: OrderStatus[] = ['proposta_aceita', 'agendado', 'em_andamento', 'concluido', 'avaliacao_pendente', 'encerrado'];

function requestStage(db: DB, r: ServiceRequest) {
  if (r.status === 'cancelada') return { label: 'Cancelada', tone: 'neutral' as const };
  if (r.status === 'contratada') return { label: 'Contratada', tone: 'green' as const };
  const qs = db.quotes.filter((q) => q.requestId === r.id && ['enviada', 'alteracao_solicitada'].includes(q.status));
  if (qs.length) return { label: `${qs.length} orçamento(s) recebido(s)`, tone: 'lime' as const };
  if (r.invitedProIds.length) return { label: 'Aguardando orçamento', tone: 'amber' as const };
  return { label: 'Solicitação enviada', tone: 'blue' as const };
}
const orderTone = (s: OrderStatus) => (s === 'cancelado' ? 'neutral' : s === 'em_disputa' ? 'red' : s === 'encerrado' ? 'green' : 'lime');

// ---------------------------------------------------------------- lista
export function Orders() {
  const { db, me } = useStore();
  const myPro = db.pros.find((p) => p.userId === me!.id);
  const [tab, setTab] = useState<'cliente' | 'profissional'>(myPro && !db.requests.some((r) => r.clientId === me!.id) ? 'profissional' : 'cliente');

  const myReqs = db.requests.filter((r) => r.clientId === me!.id && r.status === 'aberta').sort((a, b) => b.createdAt - a.createdAt);
  const myOrders = db.orders.filter((o) => o.clientId === me!.id).sort((a, b) => b.createdAt - a.createdAt);
  const incoming = myPro ? db.requests.filter((r) => r.invitedProIds.includes(myPro.id) && r.status === 'aberta').sort((a, b) => b.createdAt - a.createdAt) : [];
  const proOrders = myPro ? db.orders.filter((o) => o.proId === myPro.id).sort((a, b) => b.createdAt - a.createdAt) : [];

  return (
    <div>
      <TopBar title="Pedidos" />
      {myPro && (
        <div className="mx-4 mt-3 grid grid-cols-2 rounded-xl bg-stone-100 p-1">
          {(['cliente', 'profissional'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cx('rounded-lg py-2 text-sm font-semibold', tab === t ? 'bg-white shadow-sm' : 'text-muted')}>
              {t === 'cliente' ? 'Meus pedidos' : 'Como profissional'}
            </button>
          ))}
        </div>
      )}
      {tab === 'cliente' ? (
        <div className="space-y-6 px-4 py-4">
          <ListBlock title="Solicitações abertas" empty="Nenhuma solicitação aberta.">
            {myReqs.map((r) => (
              <RequestRow key={r.id} r={r} db={db} />
            ))}
          </ListBlock>
          <ListBlock title="Serviços contratados" empty="Você ainda não contratou serviços.">
            {myOrders.map((o) => (
              <OrderRow key={o.id} o={o} db={db} viewer="client" />
            ))}
          </ListBlock>
          {!myReqs.length && !myOrders.length && (
            <EmptyState icon={<ClipboardList />} title="Nada por aqui ainda" text="Encontre um profissional e peça um orçamento, ou publique sua necessidade no Mural." action={<Button onClick={() => go('/explorar')}>Encontrar profissionais</Button>} />
          )}
        </div>
      ) : (
        <div className="space-y-6 px-4 py-4">
          <ListBlock title="Solicitações para responder" empty="Nenhuma solicitação nova. Confira o Mural de Oportunidades.">
            {incoming.map((r) => {
              const mine = db.quotes.find((q) => q.requestId === r.id && q.proId === myPro!.id && q.status !== 'substituida');
              return (
                <Card key={r.id} className="p-4" onClick={() => go(`/solicitacao/${r.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold">{r.title}</p>
                    {mine ? <Badge tone={mine.status === 'alteracao_solicitada' ? 'amber' : 'green'}>{mine.status === 'alteracao_solicitada' ? 'Alteração pedida' : 'Orçamento enviado'}</Badge> : <Badge tone="lime">Responder</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {r.neighborhood} · {timeAgo(r.createdAt)} {r.urgent && '· urgente'}
                  </p>
                </Card>
              );
            })}
          </ListBlock>
          <ListBlock title="Serviços" empty="Nenhum serviço ainda.">
            {proOrders.map((o) => (
              <OrderRow key={o.id} o={o} db={db} viewer="pro" />
            ))}
          </ListBlock>
          <Button variant="secondary" className="w-full" onClick={() => go('/mural')}>
            Ver Mural de Oportunidades
          </Button>
        </div>
      )}
    </div>
  );
}

function ListBlock({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">{title}</h2>
      {children.length ? <div className="space-y-2">{children}</div> : <p className="text-sm text-muted">{empty}</p>}
    </section>
  );
}

function RequestRow({ r, db }: { r: ServiceRequest; db: DB }) {
  const st = requestStage(db, r);
  return (
    <Card className="p-4" onClick={() => go(`/solicitacao/${r.id}`)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold">{r.title}</p>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        {r.publicBoard && 'No Mural · '}
        {r.interests.length > 0 && `${r.interests.length} interessado(s) · `}
        {timeAgo(r.createdAt)}
      </p>
    </Card>
  );
}

function OrderRow({ o, db, viewer }: { o: Order; db: DB; viewer: 'client' | 'pro' }) {
  const pro = db.pros.find((p) => p.id === o.proId);
  const client = db.users.find((u) => u.id === o.clientId);
  return (
    <Card className="p-4" onClick={() => go(`/pedido/${o.id}`)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold">{o.title}</p>
        <Badge tone={orderTone(o.status)}>{ORDER_LABEL[o.status]}</Badge>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        {viewer === 'client' ? pro?.displayName : client?.name} · {brl(o.agreedValue)}
        {o.scheduledAt && ` · ${fmtDateTime(o.scheduledAt)}`} {o.demo && <DemoTag />}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------- detalhe da solicitação
export function RequestDetail({ id }: { id: string }) {
  const { db, me } = useStore();
  const r = db.requests.find((x) => x.id === id);
  const myPro = db.pros.find((p) => p.userId === me!.id);
  const isClient = r?.clientId === me!.id;
  const invited = !!myPro && !!r?.invitedProIds.includes(myPro.id);
  const [compare, setCompare] = useState(false);
  const { busy, run } = useAction();

  if (!r || (!isClient && !invited)) return (<><TopBar title="Solicitação" back="/pedidos" /><EmptyState title="Solicitação indisponível" text="Você não tem acesso a esta solicitação." /></>);

  const quotes = db.quotes.filter((q) => q.requestId === r.id && q.status !== 'substituida');
  const order = db.orders.find((o) => o.requestId === r.id);
  const cat = db.categories.find((c) => c.id === r.category)?.name;
  const st = requestStage(db, r);

  return (
    <div>
      <TopBar title="Solicitação" back="/pedidos" />
      <div className="space-y-4 px-4 py-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-extrabold">{r.title}</h1>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {cat} · {r.neighborhood} {r.preferredDate && `· para ${fmtDate(r.preferredDate + 'T12:00')}`} {r.urgent && '· urgente'}
          </p>
          <p className="mt-3 whitespace-pre-line">{r.description}</p>
          {r.details && <p className="mt-2 text-sm"><b>Medidas/detalhes:</b> {r.details}</p>}
          {r.photos.length > 0 && (
            <div className="mt-3 flex gap-2">
              {r.photos.map((p, i) => (
                <img key={i} src={p} alt={`Foto ${i + 1}`} className="size-20 rounded-xl object-cover" />
              ))}
            </div>
          )}
          {order && (
            <Button variant="dark" className="mt-4 w-full" onClick={() => go(`/pedido/${order.id}`)}>
              Ver pedido contratado
            </Button>
          )}
        </Card>

        {isClient ? (
          <>
            {r.publicBoard && r.status === 'aberta' && <BoardInterests r={r} />}
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold">Orçamentos ({quotes.length})</h2>
              {quotes.length >= 2 && (
                <Button size="sm" variant="secondary" icon={<Scale className="size-4" />} onClick={() => setCompare(true)}>
                  Comparar
                </Button>
              )}
            </div>
            {!quotes.length && <p className="text-sm text-muted">Nenhum orçamento ainda. Você será notificado quando chegar.</p>}
            {quotes.map((q) => (
              <QuoteCard key={q.id} q={q} canAct={r.status === 'aberta'} />
            ))}
            {r.status === 'aberta' && (
              <Button variant="danger" className="w-full" loading={busy} onClick={() => confirm('Cancelar esta solicitação?') && run(() => cancelRequest(r.id), 'Solicitação cancelada')}>
                Cancelar solicitação
              </Button>
            )}
            <CompareModal open={compare} onClose={() => setCompare(false)} quotes={quotes} />
          </>
        ) : (
          <ProQuotePanel r={r} proId={myPro!.id} />
        )}
      </div>
    </div>
  );
}

function BoardInterests({ r }: { r: ServiceRequest }) {
  const { db } = useStore();
  const { run } = useAction();
  return (
    <Card className="p-4">
      <p className="font-bold">Interessados pelo Mural ({r.interests.length})</p>
      <p className="mt-0.5 text-xs text-muted">Só quem você convidar vê a descrição completa e as fotos.</p>
      {!r.interests.length && <p className="mt-2 text-sm text-muted">Ainda ninguém. Profissionais compatíveis da região foram avisados.</p>}
      <div className="mt-3 space-y-3">
        {r.interests.map((it) => {
          const p = db.pros.find((x) => x.id === it.proId);
          if (!p) return null;
          const inv = r.invitedProIds.includes(p.id);
          return (
            <div key={it.proId} className="flex items-start gap-3">
              <Avatar name={p.displayName} hue={p.avatarHue} photo={p.photo} size={40} />
              <div className="min-w-0 flex-1">
                <button className="font-semibold underline-offset-2 hover:underline" onClick={() => go(`/p/${p.slug}`)}>
                  {p.displayName}
                </button>
                {it.message && <p className="text-sm text-muted">"{it.message}"</p>}
              </div>
              {inv ? <Badge tone="green">Convidado</Badge> : <Button size="sm" onClick={() => run(() => inviteToRequest(r.id, p.id), 'Convite enviado')}>Convidar</Button>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function QuoteLines({ q }: { q: Quote }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
      <dt className="text-muted">Mão de obra</dt>
      <dd className="text-right">{brl(q.labor)}</dd>
      <dt className="text-muted">Materiais</dt>
      <dd className="text-right">{q.materialsIncluded ? brl(q.materialsValue) : 'Não incluídos'}</dd>
      <dt className="text-muted">Deslocamento</dt>
      <dd className="text-right">{q.travel ? brl(q.travel) : 'Sem custo'}</dd>
      <dt className="text-muted">Prazo estimado</dt>
      <dd className="text-right">{q.deadlineDays} dia(s)</dd>
      <dt className="text-muted">Válido até</dt>
      <dd className="text-right">{fmtDate(q.validUntil + 'T12:00')}</dd>
      <dt className="text-muted">Pagamento</dt>
      <dd className="text-right">{q.paymentTerms || '—'}</dd>
      <dt className="text-muted">Garantia</dt>
      <dd className="text-right">{q.warranty || 'Não informada'}</dd>
    </dl>
  );
}

function QuoteCard({ q, canAct }: { q: Quote; canAct: boolean }) {
  const { db } = useStore();
  const pro = db.pros.find((p) => p.id === q.proId)!;
  const [change, setChange] = useState(false);
  const [text, setText] = useState('');
  const { busy, run } = useAction();
  const expired = new Date(q.validUntil).getTime() + DAY < Date.now();
  const open = canAct && ['enviada', 'alteracao_solicitada'].includes(q.status);
  const STATUS: Record<string, [string, 'green' | 'amber' | 'neutral' | 'lime']> = {
    enviada: ['Recebido', 'lime'], aceita: ['Aceito', 'green'], recusada: ['Recusado', 'neutral'], alteracao_solicitada: ['Alteração pedida', 'amber'],
  };
  const [label, tone] = STATUS[q.status] ?? ['', 'neutral'];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar name={pro.displayName} hue={pro.avatarHue} photo={pro.photo} size={40} />
        <div className="min-w-0 flex-1">
          <button className="truncate font-bold" onClick={() => go(`/p/${pro.slug}`)}>{pro.displayName}</button>
          <p className="text-xs text-muted">{timeAgo(q.createdAt)}</p>
        </div>
        <Badge tone={expired && open ? 'neutral' : tone}>{expired && open ? 'Expirado' : label}</Badge>
      </div>
      <p className="mt-3 text-[15px] whitespace-pre-line">{q.description}</p>
      <QuoteLines q={q} />
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm text-muted">Total</span>
        <span className="text-xl font-extrabold">{brl(quoteTotal(q))}</span>
      </div>
      {q.notes && <p className="mt-2 text-sm"><b>Observações:</b> {q.notes}</p>}
      {q.changeRequest && q.status === 'alteracao_solicitada' && <Notice tone="warn">Você pediu: {q.changeRequest}</Notice>}
      {open && !expired && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!confirm(`Aceitar a proposta de ${pro.displayName} por ${brl(quoteTotal(q))}? As outras propostas serão recusadas.`)) return;
              const oid = await run(() => acceptQuote(q.id), 'Proposta aceita! Agora combinem a data.');
              if (oid) go(`/pedido/${oid}`);
            }}
          >
            Aceitar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setChange(true)}>Alterar</Button>
          <Button size="sm" variant="danger" onClick={() => run(() => declineQuote(q.id), 'Proposta recusada')}>Recusar</Button>
        </div>
      )}
      <Modal open={change} onClose={() => setChange(false)} title="Pedir alteração">
        <textarea className={inputCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Consegue incluir o material? Dá para fazer em 3 dias?" />
        <Button className="mt-3 w-full" loading={busy} onClick={async () => { const ok = await run(() => { requestQuoteChange(q.id, text); return true; }, 'Pedido de alteração enviado'); if (ok) setChange(false); }}>
          Enviar
        </Button>
      </Modal>
    </Card>
  );
}

/** Orçamento Comparável: lado a lado, sem eleger "o melhor" pelo preço. */
function CompareModal({ open, onClose, quotes }: { open: boolean; onClose: () => void; quotes: Quote[] }) {
  const { db } = useStore();
  const rows: [string, (q: Quote) => string][] = [
    ['Total', (q) => brl(quoteTotal(q))],
    ['Mão de obra', (q) => brl(q.labor)],
    ['Materiais', (q) => (q.materialsIncluded ? `Incluídos (${brl(q.materialsValue)})` : 'Não incluídos')],
    ['Deslocamento', (q) => (q.travel ? brl(q.travel) : 'Sem custo')],
    ['Prazo', (q) => `${q.deadlineDays} dia(s)`],
    ['Garantia', (q) => q.warranty || 'Não informada'],
    ['Pagamento', (q) => q.paymentTerms || '—'],
    ['Validade', (q) => fmtDate(q.validUntil + 'T12:00')],
    ['Escopo', (q) => q.description],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Comparar orçamentos">
      <Notice>Compare escopo, materiais, prazo e garantia — não apenas o preço. O mais barato nem sempre inclui o mesmo serviço.</Notice>
      <div className="scroll-x mt-3">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr>
              <th className="w-24" />
              {quotes.map((q) => (
                <th key={q.id} className="p-2 align-bottom font-bold">{db.pros.find((p) => p.id === q.proId)?.displayName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, f]) => (
              <tr key={l} className="border-t border-line align-top">
                <th className="p-2 font-semibold text-muted">{l}</th>
                {quotes.map((q) => (
                  <td key={q.id} className={cx('p-2', l === 'Escopo' && 'text-xs')}>{f(q)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function ProQuotePanel({ r, proId }: { r: ServiceRequest; proId: string }) {
  const { db } = useStore();
  const mine = db.quotes.filter((q) => q.requestId === r.id && q.proId === proId).sort((a, b) => b.createdAt - a.createdAt);
  const current = mine.find((q) => q.status !== 'substituida');
  const client = db.users.find((u) => u.id === r.clientId);
  const [editing, setEditing] = useState(!current);
  const { run } = useAction();
  const chat = async () => {
    const conv = db.conversations.find((c) => c.clientId === r.clientId && c.proId === proId);
    if (conv) go(`/mensagens/${conv.id}`);
    else {
      const idc = await run(() => openConversation(proId));
      if (idc) go('/mensagens');
    }
  };
  return (
    <>
      <Card className="flex items-center justify-between p-4">
        <p className="text-sm">Cliente: <b>{client?.name}</b></p>
        <Button size="sm" variant="secondary" icon={<MessageCircle className="size-4" />} onClick={chat}>Conversar</Button>
      </Card>
      {current && !editing && (
        <>
          <h2 className="text-[17px] font-bold">Seu orçamento</h2>
          {current.status === 'alteracao_solicitada' && <Notice tone="warn">O cliente pediu alterações: "{current.changeRequest}"</Notice>}
          <Card className="p-4">
            <p className="whitespace-pre-line">{current.description}</p>
            <QuoteLines q={current} />
            <p className="mt-3 text-right text-xl font-extrabold">{brl(quoteTotal(current))}</p>
          </Card>
          {r.status === 'aberta' && ['enviada', 'alteracao_solicitada'].includes(current.status) && (
            <Button variant="secondary" className="w-full" onClick={() => setEditing(true)}>Enviar nova versão</Button>
          )}
        </>
      )}
      {editing && r.status === 'aberta' && <QuoteForm requestId={r.id} base={current} onDone={() => setEditing(false)} />}
      {r.status !== 'aberta' && !current && <p className="text-sm text-muted">Esta solicitação não está mais aberta.</p>}
    </>
  );
}

function QuoteForm({ requestId, base, onDone }: { requestId: string; base?: Quote; onDone: () => void }) {
  const [f, setF] = useState<QuoteInput>({
    description: base?.description ?? '', labor: base?.labor ?? 0, materialsIncluded: base?.materialsIncluded ?? false, materialsValue: base?.materialsValue ?? 0,
    travel: base?.travel ?? 0, deadlineDays: base?.deadlineDays ?? 1, validUntil: base?.validUntil ?? new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10),
    paymentTerms: base?.paymentTerms ?? 'Pix ou dinheiro ao final', warranty: base?.warranty ?? '', notes: base?.notes ?? '',
  });
  const { busy, run } = useAction();
  const n = (s: string) => (s === '' ? 0 : Number(s));
  const total = f.labor + (f.materialsIncluded ? f.materialsValue : 0) + f.travel;
  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-[17px] font-bold">{base ? 'Nova versão do orçamento' : 'Enviar orçamento'}</h2>
      <Field label="Descrição do serviço">
        <textarea className={inputCls} rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="O que está incluído, como será feito…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mão de obra (R$)"><input className={inputCls} type="number" min={0} value={f.labor || ''} onChange={(e) => setF({ ...f, labor: n(e.target.value) })} /></Field>
        <Field label="Deslocamento (R$)"><input className={inputCls} type="number" min={0} value={f.travel || ''} onChange={(e) => setF({ ...f, travel: n(e.target.value) })} /></Field>
      </div>
      <Check checked={f.materialsIncluded} onChange={(v) => setF({ ...f, materialsIncluded: v })}>Materiais incluídos no valor</Check>
      {f.materialsIncluded && <Field label="Valor dos materiais (R$)"><input className={inputCls} type="number" min={0} value={f.materialsValue || ''} onChange={(e) => setF({ ...f, materialsValue: n(e.target.value) })} /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prazo (dias)"><input className={inputCls} type="number" min={1} value={f.deadlineDays || ''} onChange={(e) => setF({ ...f, deadlineDays: n(e.target.value) })} /></Field>
        <Field label="Válido até"><input className={inputCls} type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} /></Field>
      </div>
      <Field label="Condições de pagamento"><input className={inputCls} value={f.paymentTerms} onChange={(e) => setF({ ...f, paymentTerms: e.target.value })} /></Field>
      <Field label="Garantia (opcional)"><input className={inputCls} value={f.warranty} onChange={(e) => setF({ ...f, warranty: e.target.value })} placeholder="Ex.: 90 dias para o serviço executado" /></Field>
      <Field label="Observações e limitações"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3">
        <span className="text-sm font-semibold">Total para o cliente</span>
        <span className="text-xl font-extrabold">{brl(total)}</span>
      </div>
      <div className="flex gap-2">
        {base && <Button variant="secondary" onClick={onDone}>Cancelar</Button>}
        <Button className="flex-1" loading={busy} onClick={async () => { const ok = await run(() => { sendQuote(requestId, f); return true; }, 'Orçamento enviado!'); if (ok) onDone(); }}>
          Enviar orçamento
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- detalhe do pedido
export function OrderDetail({ id }: { id: string }) {
  const { db, me } = useStore();
  const o = db.orders.find((x) => x.id === id);
  const pro = o && db.pros.find((p) => p.id === o.proId);
  const role = o?.clientId === me!.id ? 'client' : pro?.userId === me!.id ? 'pro' : null;
  const [modal, setModal] = useState<null | 'schedule' | 'reschedule' | 'cancel' | 'dispute' | 'payment' | 'review'>(null);
  const { busy, run } = useAction();
  if (!o || !pro || !role) return (<><TopBar title="Pedido" back="/pedidos" /><EmptyState title="Pedido indisponível" /></>);

  const quote = db.quotes.find((q) => q.id === o.quoteId);
  const client = db.users.find((u) => u.id === o.clientId);
  const stepIdx = FLOW.indexOf(o.status);
  const conv = db.conversations.find((c) => c.clientId === o.clientId && c.proId === o.proId);
  const name = (uid: string) => (uid === me!.id ? 'Você' : db.users.find((u) => u.id === uid)?.name ?? 'Equipe TalentosLocais');

  return (
    <div>
      <TopBar title="Pedido" back="/pedidos" />
      <div className="space-y-4 px-4 py-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-extrabold">{o.title}</h1>
            <Badge tone={orderTone(o.status)}>{ORDER_LABEL[o.status]}</Badge>
          </div>
          {o.demo && <div className="mt-1"><DemoTag /></div>}
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted">Cliente</dt><dd>{client?.name}</dd>
            <dt className="text-muted">Profissional</dt><dd><button className="font-semibold text-brand-700" onClick={() => go(`/p/${pro.slug}`)}>{pro.displayName}</button></dd>
            <dt className="text-muted">Valor acordado</dt><dd className="font-bold">{brl(o.agreedValue)}</dd>
            <dt className="text-muted">Data e horário</dt><dd>{o.scheduledAt ? fmtDateTime(o.scheduledAt) : 'A combinar'}</dd>
            <dt className="text-muted">Local</dt><dd>{o.addressShared ?? 'Não compartilhado'} <span className="block text-xs text-muted">Visível apenas para as duas partes</span></dd>
            <dt className="text-muted">Pagamento</dt>
            <dd>
              {o.paymentMethod ?? 'Combinado diretamente'}
              {o.paymentInformedBy.length > 0 && <span className="block text-xs text-muted">Informado por: {o.paymentInformedBy.map(name).join(', ')} (não confirmado por provedor)</span>}
            </dd>
          </dl>
          {quote && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm"><b>Escopo combinado:</b> {quote.description}</p>}
        </Card>

        {!['cancelado', 'em_disputa'].includes(o.status) && (
          <Card className="p-4">
            <ol className="space-y-2.5">
              {FLOW.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold', i < stepIdx ? 'bg-lime-500 text-white' : i === stepIdx ? 'bg-brand-800 text-white' : 'bg-stone-100 text-muted')}>
                    {i < stepIdx ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  <span className={cx(i === stepIdx ? 'font-bold' : i > stepIdx && 'text-muted')}>{ORDER_LABEL[s]}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        {o.status === 'cancelado' && <Notice tone="warn">Pedido cancelado. Motivo: {o.cancelReason ?? '—'}</Notice>}
        {o.status === 'em_disputa' && <Notice tone="warn">Disputa em análise pela equipe. Motivo informado: {o.disputeReason}. Vocês podem continuar conversando pelo chat.</Notice>}

        {o.rescheduleRequest && (
          <Card className="p-4">
            <p className="font-bold">Reagendamento proposto</p>
            <p className="text-sm">{name(o.rescheduleRequest.by)} propôs {fmtDateTime(o.rescheduleRequest.to)}.</p>
            {o.rescheduleRequest.by !== me!.id ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => run(() => answerReschedule(o.id, true), 'Nova data confirmada')}>Aceitar</Button>
                <Button size="sm" variant="secondary" onClick={() => run(() => answerReschedule(o.id, false), 'Reagendamento recusado')}>Recusar</Button>
              </div>
            ) : <p className="mt-1 text-xs text-muted">Aguardando confirmação da outra parte.</p>}
          </Card>
        )}

        {/* Ações conforme o papel e o status */}
        <div className="grid gap-2">
          {o.status === 'proposta_aceita' && <Button icon={<CalendarClock className="size-4" />} onClick={() => setModal('schedule')}>Agendar serviço</Button>}
          {o.status === 'agendado' && role === 'pro' && <Button loading={busy} onClick={() => run(() => startOrder(o.id), 'Serviço iniciado')}>Iniciar serviço</Button>}
          {o.status === 'agendado' && !o.rescheduleRequest && <Button variant="secondary" onClick={() => setModal('reschedule')}>Propor nova data</Button>}
          {o.status === 'em_andamento' && role === 'pro' && <Button loading={busy} onClick={() => run(() => finishOrder(o.id), 'Marcado como concluído')}>Marcar como concluído</Button>}
          {o.status === 'concluido' && role === 'client' && <Button loading={busy} onClick={() => run(() => confirmCompletion(o.id), 'Conclusão confirmada')}>Confirmar conclusão do serviço</Button>}
          {o.status === 'concluido' && role === 'pro' && <p className="text-center text-sm text-muted">Aguardando o cliente confirmar a conclusão.</p>}
          {o.status === 'avaliacao_pendente' && role === 'client' && (
            <>
              <Button icon={<Star className="size-4" />} onClick={() => setModal('review')}>Avaliar o profissional</Button>
              <Button variant="ghost" onClick={() => run(() => closeWithoutReview(o.id), 'Pedido encerrado')}>Encerrar sem avaliar</Button>
            </>
          )}
          {!['cancelado', 'proposta_aceita'].includes(o.status) && !o.paymentInformedBy.includes(me!.id) && (
            <Button variant="secondary" onClick={() => setModal('payment')}>{role === 'client' ? 'Informar pagamento realizado' : 'Informar pagamento recebido'}</Button>
          )}
          {conv && <Button variant="secondary" icon={<MessageCircle className="size-4" />} onClick={() => go(`/mensagens/${conv.id}`)}>Mensagens deste pedido</Button>}
          {['proposta_aceita', 'agendado', 'em_andamento'].includes(o.status) && <Button variant="danger" onClick={() => setModal('cancel')}>Cancelar pedido</Button>}
          {['agendado', 'em_andamento', 'concluido', 'avaliacao_pendente'].includes(o.status) && <Button variant="ghost" onClick={() => setModal('dispute')}>Tive um problema (abrir disputa)</Button>}
        </div>

        <Card className="p-4">
          <p className="mb-2 flex items-center gap-2 font-bold"><FileText className="size-4" /> Histórico</p>
          <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
            {[...o.history].reverse().map((h, i) => (
              <li key={i}>
                <p><b>{h.action}</b>{h.note && ` — ${h.note}`}</p>
                <p className="text-xs text-muted">{name(h.by)} · {fmtDateTime(h.at)}</p>
              </li>
            ))}
          </ol>
        </Card>
        <p className="text-center text-xs text-muted">O TalentosLocais é uma ferramenta de conexão: o pagamento é combinado diretamente entre cliente e profissional. A plataforma não intermedia nem guarda valores.</p>
      </div>
      <OrderModals o={o} me={me!} modal={modal} setModal={setModal} />
    </div>
  );
}

function OrderModals({ o, modal, setModal }: { o: Order; me: User; modal: string | null; setModal: (m: null) => void }) {
  const [when, setWhen] = useState('');
  const [addr, setAddr] = useState(o.addressShared ?? '');
  const [text, setText] = useState('');
  const [method, setMethod] = useState('Pix');
  const [ratings, setRatings] = useState<Ratings>({ quality: 0, punctuality: 0, communication: 0, agreement: 0, value: 0 });
  const [comment, setComment] = useState('');
  const { busy, run } = useAction();
  const close = () => setModal(null);
  const exec = async (fn: () => void, ok: string) => {
    const r = await run(() => { fn(); return true; }, ok);
    if (r) { close(); setText(''); }
  };
  const minDT = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  return (
    <>
      <Modal open={modal === 'schedule'} onClose={close} title="Agendar serviço">
        <div className="space-y-4">
          <Field label="Data e horário"><input type="datetime-local" min={minDT} className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Endereço ou ponto de encontro (opcional)" hint="Compartilhado apenas com a outra parte deste pedido. Você pode informar só uma referência.">
            <input className={inputCls} value={addr} onChange={(e) => setAddr(e.target.value)} />
          </Field>
          <Button className="w-full" loading={busy} onClick={() => exec(() => scheduleOrder(o.id, when, addr), 'Serviço agendado')}>Confirmar agendamento</Button>
        </div>
      </Modal>
      <Modal open={modal === 'reschedule'} onClose={close} title="Propor nova data">
        <Field label="Nova data e horário"><input type="datetime-local" min={minDT} className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
        <p className="mt-2 text-xs text-muted">A nova data só vale depois que a outra parte confirmar.</p>
        <Button className="mt-4 w-full" loading={busy} onClick={() => exec(() => requestReschedule(o.id, when), 'Proposta de nova data enviada')}>Enviar proposta</Button>
      </Modal>
      <Modal open={modal === 'cancel'} onClose={close} title="Cancelar pedido">
        <Field label="Motivo do cancelamento"><textarea className={inputCls} rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Button variant="danger" className="mt-4 w-full" loading={busy} onClick={() => exec(() => cancelOrder(o.id, text), 'Pedido cancelado')}>Confirmar cancelamento</Button>
      </Modal>
      <Modal open={modal === 'dispute'} onClose={close} title="Abrir disputa">
        <p className="mb-3 text-sm text-muted">Use quando não for possível resolver pela conversa. A equipe analisa o histórico do pedido e das mensagens.</p>
        <Field label="Descreva o problema"><textarea className={inputCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Button variant="dark" className="mt-4 w-full" loading={busy} onClick={() => exec(() => openDispute(o.id, text), 'Disputa aberta')}>Abrir disputa</Button>
      </Modal>
      <Modal open={modal === 'payment'} onClose={close} title="Informar pagamento">
        <Notice tone="warn">Pagamentos dentro do app ainda não estão disponíveis. Aqui você apenas registra o que foi combinado e pago diretamente — o app não confirma a transação.</Notice>
        <div className="mt-4">
          <Field label="Forma de pagamento">
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              {['Pix', 'Dinheiro', 'Cartão (maquininha do profissional)', 'Transferência bancária', 'Outro'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Button className="mt-4 w-full" loading={busy} onClick={() => exec(() => informPayment(o.id, method), 'Pagamento informado')}>Registrar</Button>
      </Modal>
      <Modal open={modal === 'review'} onClose={close} title="Avaliar serviço">
        <RatingInput label="Qualidade do trabalho" value={ratings.quality} onChange={(v) => setRatings({ ...ratings, quality: v })} />
        <RatingInput label="Pontualidade" value={ratings.punctuality} onChange={(v) => setRatings({ ...ratings, punctuality: v })} />
        <RatingInput label="Comunicação" value={ratings.communication} onChange={(v) => setRatings({ ...ratings, communication: v })} />
        <RatingInput label="Cumprimento do combinado" value={ratings.agreement} onChange={(v) => setRatings({ ...ratings, agreement: v })} />
        <RatingInput label="Custo-benefício" value={ratings.value} onChange={(v) => setRatings({ ...ratings, value: v })} />
        <div className="mt-3">
          <Field label="Comentário (opcional)" hint="Evite expor dados pessoais, seus ou do profissional.">
            <textarea className={inputCls} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-4 w-full" loading={busy} onClick={() => exec(() => submitReview(o.id, ratings, comment), 'Avaliação publicada. Obrigado!')}>Publicar avaliação</Button>
      </Modal>
    </>
  );
}

