import { CalendarDays, Camera, Crown, Inbox, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Chip, EmptyState, Field, Modal, Notice, TopBar, inputCls, useAction } from '../components/ui';
import { declareIncome } from '../data/actions';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { proStats } from '../lib/search';
import { DAY, brl, fmtDateTime } from '../lib/utils';

type Period = '7' | '30' | 'custom';

export function Dashboard() {
  const { db, me } = useStore();
  const pro = db.pros.find((p) => p.userId === me!.id);
  const [period, setPeriod] = useState<Period>('30');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [incomeOpen, setIncomeOpen] = useState(false);

  const range = useMemo(() => {
    if (period === 'custom') return [new Date(from + 'T00:00').getTime(), new Date(to + 'T23:59:59').getTime()] as const;
    return [Date.now() - Number(period) * DAY, Date.now()] as const;
  }, [period, from, to]);

  if (!pro) return (<><TopBar title="Painel" back="/perfil" /><EmptyState title="Crie sua vitrine primeiro" action={<Button onClick={() => go('/perfil/vitrine')}>Criar vitrine</Button>} /></>);

  const inR = (t: number) => t >= range[0] && t <= range[1];
  const views = db.views.filter((v) => v.proId === pro.id && inR(v.at));
  const requests = db.requests.filter((r) => r.invitedProIds.includes(pro.id) && inR(r.createdAt));
  const quotes = db.quotes.filter((q) => q.proId === pro.id && q.status !== 'substituida' && inR(q.createdAt));
  const accepted = quotes.filter((q) => q.status === 'aceita');
  const completed = db.orders.filter((o) => o.proId === pro.id && ['concluido', 'avaliacao_pendente', 'encerrado'].includes(o.status) && inR(o.history.at(-1)?.at ?? o.createdAt));
  const reviews = db.reviews.filter((r) => r.proId === pro.id && r.status !== 'removida' && inR(r.createdAt));
  const stats = proStats(db, pro);
  const declared = db.income.filter((i) => i.proId === pro.id && inR(i.at)).reduce((a, b) => a + b.amount, 0);
  const conversion = quotes.length ? Math.round((accepted.length / quotes.length) * 100) : null;
  const isPro = pro.plan === 'pro';

  const days = Math.min(31, Math.max(1, Math.ceil((range[1] - range[0]) / DAY)));
  const perDay = Array.from({ length: days }, (_, i) => {
    const start = range[1] - (days - i) * DAY;
    return views.filter((v) => v.at > start && v.at <= start + DAY).length;
  });
  const maxDay = Math.max(1, ...perDay);

  const demand: Record<string, number> = {};
  db.requests.filter((r) => inR(r.createdAt) && r.city === pro.city).forEach((r) => (demand[r.category] = (demand[r.category] ?? 0) + 1));
  const demandList = Object.entries(demand).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const agenda = db.orders.filter((o) => o.proId === pro.id && o.status === 'agendado' && o.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const toAnswer = db.requests.filter((r) => r.status === 'aberta' && r.invitedProIds.includes(pro.id) && !db.quotes.some((q) => q.requestId === r.id && q.proId === pro.id && q.status !== 'substituida'));
  const lastPhoto = Math.max(0, ...db.portfolio.filter((p) => p.proId === pro.id).map((p) => p.createdAt));
  const needsPortfolio = stats.portfolioCount < 3 || Date.now() - lastPhoto > 60 * DAY;

  const Metric = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
    <Card className="p-3.5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {note && <p className="text-[11px] text-muted">{note}</p>}
    </Card>
  );

  return (
    <div>
      <TopBar title="Painel do profissional" back="/perfil" />
      <div className="space-y-4 px-4 py-4">
        {toAnswer.length > 0 && (
          <button onClick={() => go(`/solicitacao/${toAnswer[0]!.id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-lime-500 p-4 text-left text-white">
            <Inbox className="size-6" />
            <span className="flex-1 font-bold">{toAnswer.length} solicitação(ões) aguardando seu orçamento</span>
            <span className="text-sm underline">Responder</span>
          </button>
        )}
        {needsPortfolio && (
          <Notice>
            <span className="inline-flex items-center gap-1"><Camera className="size-4" /> Perfis com portfólio atualizado recebem mais pedidos.</span>{' '}
            <button className="font-semibold underline" onClick={() => go('/perfil/vitrine')}>Adicionar trabalhos</button>
          </Notice>
        )}
        <div className="scroll-x flex gap-2">
          <Chip active={period === '7'} onClick={() => setPeriod('7')}>Semana</Chip>
          <Chip active={period === '30'} onClick={() => setPeriod('30')}>Mês</Chip>
          <Chip active={period === 'custom'} onClick={() => setPeriod('custom')}>Personalizado</Chip>
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="De"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Até"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Visualizações do perfil" value={views.length} />
          <Metric label="Solicitações recebidas" value={requests.length} />
          <Metric label="Orçamentos enviados" value={quotes.length} />
          <Metric label="Orçamentos aceitos" value={accepted.length} />
          <Metric label="Serviços concluídos" value={completed.length} />
          <Metric label="Taxa de conversão" value={conversion === null ? '—' : `${conversion}%`} note="aceitos ÷ enviados" />
          <Metric label="Avaliação média" value={stats.avg ? stats.avg.toFixed(1) : '—'} note={`${reviews.length} nova(s) no período · ${stats.reviewCount} no total`} />
        </div>

        <Card className="p-4">
          <p className="font-bold">Faturamento</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">Informado por você</p>
              <p className="text-xl font-extrabold">{brl(declared)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Confirmado por pagamento</p>
              <p className="text-xl font-extrabold text-muted">—</p>
              <p className="text-[11px] text-muted">Sem provedor de pagamento integrado</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setIncomeOpen(true)}>Registrar valor recebido</Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">Visualizações por dia</p>
            {!isPro && <Badge tone="lime"><Crown className="size-3" /> Profissional</Badge>}
          </div>
          {isPro ? (
            <div className="mt-3 flex h-28 items-end gap-[3px]" role="img" aria-label={`Visualizações diárias, máximo ${maxDay}`}>
              {perDay.map((v, i) => <div key={i} title={`${v}`} className="flex-1 rounded-t bg-brand-600" style={{ height: `${(v / maxDay) * 100}%`, minHeight: 2 }} />)}
            </div>
          ) : <Locked />}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">Categorias mais procuradas na sua cidade</p>
            {!isPro && <Badge tone="lime"><Crown className="size-3" /> Profissional</Badge>}
          </div>
          {isPro ? (
            demandList.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {demandList.map(([c, n]) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="w-40 truncate">{db.categories.find((x) => x.id === c)?.name}</span>
                    <span className="h-2 flex-1 rounded-full bg-stone-100"><span className="block h-2 rounded-full bg-lime-500" style={{ width: `${(n / demandList[0]![1]) * 100}%` }} /></span>
                    <b className="w-6 text-right">{n}</b>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">Sem solicitações no período.</p>
          ) : <Locked />}
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-2 font-bold"><CalendarDays className="size-4" /> Agenda</p>
          {!agenda.length && <p className="mt-2 text-sm text-muted">Nenhum serviço agendado.</p>}
          <ul className="mt-2 divide-y divide-line">
            {agenda.map((o) => (
              <li key={o.id}>
                <button onClick={() => go(`/pedido/${o.id}`)} className="flex w-full justify-between gap-2 py-2.5 text-left text-sm">
                  <span className="font-semibold">{o.title}</span>
                  <span className="text-muted">{fmtDateTime(o.scheduledAt!)}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => go('/pedidos')}>Todos os pedidos</Button>
        </Card>
        <p className="text-center text-xs text-muted">Indicadores calculados com os dados registrados na plataforma.</p>
      </div>
      <IncomeModal open={incomeOpen} onClose={() => setIncomeOpen(false)} proId={pro.id} />
    </div>
  );
}

function Locked() {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 p-3 text-sm text-muted">
      <Lock className="size-4 shrink-0" />
      <span className="flex-1">Disponível no plano Profissional.</span>
      <Button size="sm" variant="secondary" onClick={() => go('/planos')}>Ver planos</Button>
    </div>
  );
}

function IncomeModal({ open, onClose, proId }: { open: boolean; onClose: () => void; proId: string }) {
  const { db } = useStore();
  const [amount, setAmount] = useState('');
  const [orderId, setOrderId] = useState('');
  const { busy, run } = useAction();
  const orders = db.orders.filter((o) => o.proId === proId && o.status !== 'cancelado');
  return (
    <Modal open={open} onClose={onClose} title="Registrar valor recebido">
      <p className="mb-3 text-sm text-muted">Esse valor aparece como "informado por você" e serve só para sua organização.</p>
      <div className="space-y-3">
        <Field label="Valor (R$)"><input type="number" min={0} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Pedido relacionado (opcional)">
          <select className={inputCls} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">Nenhum (serviço fora do app)</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.title} · {brl(o.agreedValue)}</option>)}
          </select>
        </Field>
        <Button className="w-full" loading={busy} onClick={async () => { const ok = await run(() => { declareIncome(Number(amount), orderId || undefined); return true; }, 'Valor registrado'); if (ok) { setAmount(''); onClose(); } }}>Registrar</Button>
      </div>
    </Modal>
  );
}
