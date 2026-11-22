import { CalendarDays, MapPin, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, DemoTag, EmptyState, Modal, Notice, TopBar, inputCls, useAction } from '../components/ui';
import { expressInterest } from '../data/actions';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { fmtDate, timeAgo } from '../lib/utils';

/** Mural de Oportunidades: profissionais veem só o resumo e demonstram interesse. */
export function Board() {
  const { db, me } = useStore();
  const pro = db.pros.find((p) => p.userId === me!.id);
  const [target, setTarget] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const { busy, run } = useAction();
  const open = db.requests.filter((r) => r.publicBoard && r.status === 'aberta').sort((a, b) => b.createdAt - a.createdAt);
  const mine = open.filter((r) => r.clientId === me!.id);
  const forMe = pro ? open.filter((r) => r.clientId !== me!.id && pro.categories.includes(r.category) && (r.city === pro.city || pro.neighborhoods.includes(r.neighborhood))) : [];
  const others = open.filter((r) => r.clientId !== me!.id && !forMe.includes(r));

  const Item = ({ r, compatible }: { r: (typeof open)[number]; compatible?: boolean }) => {
    const interested = pro && r.interests.some((i) => i.proId === pro.id);
    const invited = pro && r.invitedProIds.includes(pro.id);
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold">{r.title}</p>
          {r.demo && <DemoTag />}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          <span>{db.categories.find((c) => c.id === r.category)?.name}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{r.neighborhood}</span>
          {r.preferredDate && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{fmtDate(r.preferredDate + 'T12:00')}</span>}
          <span>{timeAgo(r.createdAt)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{r.interests.length} interessado(s)</span>
          {r.clientId === me!.id ? (
            <Button size="sm" variant="secondary" onClick={() => go(`/solicitacao/${r.id}`)}>Gerenciar</Button>
          ) : invited ? (
            <Button size="sm" onClick={() => go(`/solicitacao/${r.id}`)}>Enviar orçamento</Button>
          ) : interested ? (
            <Badge tone="green">Interesse enviado</Badge>
          ) : compatible ? (
            <Button size="sm" onClick={() => setTarget(r.id)}>Tenho interesse</Button>
          ) : null}
        </div>
      </Card>
    );
  };

  return (
    <div>
      <TopBar title="Mural de Oportunidades" back={true} right={<Button size="sm" variant="ghost" onClick={() => go('/solicitar')}>Publicar</Button>} />
      <div className="space-y-5 px-4 py-4">
        <Notice>Clientes publicam necessidades; profissionais compatíveis demonstram interesse. A descrição completa e as fotos só aparecem para quem o cliente convidar.</Notice>
        {mine.length > 0 && <section className="space-y-2"><h2 className="text-sm font-bold text-muted uppercase">Minhas publicações</h2>{mine.map((r) => <Item key={r.id} r={r} />)}</section>}
        {pro && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-muted uppercase">Compatíveis com você</h2>
            {forMe.length ? forMe.map((r) => <Item key={r.id} r={r} compatible />) : <p className="text-sm text-muted">Nenhuma oportunidade nas suas categorias e região agora.</p>}
          </section>
        )}
        {others.length > 0 && <section className="space-y-2"><h2 className="text-sm font-bold text-muted uppercase">Outras oportunidades</h2>{others.map((r) => <Item key={r.id} r={r} />)}</section>}
        {!open.length && <EmptyState icon={<Megaphone />} title="O mural está vazio" text="Publique uma necessidade e deixe os talentos da região te encontrarem." action={<Button onClick={() => go('/solicitar')}>Publicar necessidade</Button>} />}
      </div>
      <Modal open={!!target} onClose={() => setTarget(null)} title="Demonstrar interesse">
        <p className="mb-3 text-sm text-muted">Mande uma mensagem curta. Se o cliente te convidar, você verá os detalhes e poderá enviar orçamento.</p>
        <textarea className={inputCls} rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Faço coberturas metálicas há 10 anos, posso visitar esta semana." />
        <Button className="mt-3 w-full" loading={busy} onClick={async () => { const ok = await run(() => { expressInterest(target!, msg); return true; }, 'Interesse enviado ao cliente'); if (ok) { setTarget(null); setMsg(''); } }}>Enviar</Button>
      </Modal>
    </div>
  );
}
