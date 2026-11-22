import { Ban, ClipboardList, Flag, MessageCircle, MoreVertical, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ReportModal } from '../components/ReportModal';
import { Avatar, Badge, EmptyState, Modal, TopBar, useAction } from '../components/ui';
import { markConversationRead, sendMessage, toggleBlock } from '../data/actions';
import { QUICK_REPLIES } from '../data/catalog';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { cx, fmtDateTime, timeAgo } from '../lib/utils';
import type { ReportTarget } from '../types';

export function Inbox() {
  const { db, me } = useStore();
  const convs = db.conversations.filter((c) => c.clientId === me!.id || c.proUserId === me!.id).sort((a, b) => b.lastAt - a.lastAt);
  return (
    <div>
      <TopBar title="Mensagens" />
      {!convs.length && <EmptyState icon={<MessageCircle />} title="Nenhuma conversa" text="Converse com profissionais pelo perfil deles. Suas negociações ficam registradas aqui." />}
      <ul className="divide-y divide-line">
        {convs.map((c) => {
          const asClient = c.clientId === me!.id;
          const pro = db.pros.find((p) => p.id === c.proId);
          const other = asClient ? pro?.displayName : db.users.find((u) => u.id === c.clientId)?.name;
          const msgs = db.messages.filter((m) => m.convId === c.id);
          const last = msgs[msgs.length - 1];
          const unread = msgs.filter((m) => !m.readBy.includes(me!.id) && m.senderId !== me!.id).length;
          return (
            <li key={c.id}>
              <button onClick={() => go(`/mensagens/${c.id}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white">
                <Avatar name={other ?? '?'} hue={asClient ? pro?.avatarHue ?? 150 : 200} photo={asClient ? pro?.photo : undefined} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cx('truncate', unread ? 'font-extrabold' : 'font-semibold')}>{other}</p>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(c.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted">{last ? (last.kind === 'system' ? `• ${last.text}` : last.text) : 'Comece a conversa'}</p>
                    {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime-500 px-1 text-[11px] font-bold text-white">{unread}</span>}
                  </div>
                  <p className="text-[11px] text-muted">{asClient ? 'Você está contratando' : 'Você é o profissional'}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Chat({ id }: { id: string }) {
  const { db, me } = useStore();
  const c = db.conversations.find((x) => x.id === id);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [reportT, setReportT] = useState<{ type: ReportTarget; id: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const { busy, run } = useAction();
  const msgs = c ? db.messages.filter((m) => m.convId === c.id) : [];

  useEffect(() => {
    if (c) markConversationRead(c.id);
    end.current?.scrollIntoView({ block: 'end' });
  }, [c?.id, msgs.length]); // eslint-disable-line

  if (!c || (c.clientId !== me!.id && c.proUserId !== me!.id))
    return (<><TopBar title="Conversa" back="/mensagens" /><EmptyState title="Conversa não encontrada" /></>);

  const asClient = c.clientId === me!.id;
  const pro = db.pros.find((p) => p.id === c.proId);
  const otherId = asClient ? c.proUserId : c.clientId;
  const otherName = asClient ? pro?.displayName : db.users.find((u) => u.id === c.clientId)?.name;
  const blocked = me!.blocked.includes(otherId);
  const req = c.requestId ? db.requests.find((r) => r.id === c.requestId) : undefined;

  const send = async (t: string) => {
    const ok = await run(() => { sendMessage(c.id, t); return true; });
    if (ok) setText('');
  };

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        title={otherName ?? 'Conversa'}
        back="/mensagens"
        right={<button aria-label="Mais opções" onClick={() => setMenu(true)} className="rounded-full p-2 hover:bg-brand-50"><MoreVertical className="size-5" /></button>}
      />
      {req && (
        <button onClick={() => go(`/solicitacao/${req.id}`)} className="flex items-center gap-2 border-b border-line bg-white px-4 py-2 text-left text-sm">
          <ClipboardList className="size-4 text-brand-700" /> <span className="truncate">Sobre: <b>{req.title}</b></span>
        </button>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <p className="mx-auto max-w-xs text-center text-[11px] text-muted">Para sua segurança, não envie senhas ou dados de cartão. Desconfie de pedidos de pagamento antecipado fora do combinado.</p>
        {msgs.map((m) =>
          m.kind === 'system' ? (
            <p key={m.id} className="mx-auto w-fit rounded-full bg-brand-50 px-3 py-1 text-center text-xs font-medium text-brand-800">{m.text}</p>
          ) : (
            <div key={m.id} className={cx('group flex flex-col', m.senderId === me!.id ? 'items-end' : 'items-start')}>
              <div className={cx('max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] whitespace-pre-line', m.senderId === me!.id ? 'rounded-br-md bg-brand-800 text-white' : 'rounded-bl-md border border-line bg-white')}>{m.text}</div>
              <span className="mt-0.5 flex gap-2 text-[10px] text-muted">
                {fmtDateTime(m.at)}
                {m.senderId !== me!.id && <button className="underline" onClick={() => setReportT({ type: 'mensagem', id: m.id })}>denunciar</button>}
              </span>
            </div>
          ),
        )}
        <div ref={end} />
      </div>
      {blocked ? (
        <div className="border-t border-line bg-white p-4 text-center text-sm text-muted">Você bloqueou este usuário. <button className="font-semibold text-brand-700" onClick={() => run(() => toggleBlock(otherId), 'Desbloqueado')}>Desbloquear</button></div>
      ) : (
        <div className="border-t border-line bg-white safe-b">
          <div className="scroll-x flex gap-2 px-3 pt-2">
            {QUICK_REPLIES.map((q) => (
              <button key={q} onClick={() => send(q)} className="h-8 shrink-0 rounded-full border border-line px-3 text-[13px] hover:border-lime-500">{q}</button>
            ))}
          </div>
          <form className="flex items-end gap-2 p-3" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} placeholder="Escreva uma mensagem…" aria-label="Mensagem" className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-bg px-3.5 py-2.5 outline-none focus:border-lime-500" />
            <button disabled={busy || !text.trim()} aria-label="Enviar" className="grid size-11 shrink-0 place-items-center rounded-full bg-lime-500 text-white disabled:opacity-40"><Send className="size-5" /></button>
          </form>
        </div>
      )}
      <Modal open={menu} onClose={() => setMenu(false)} title="Opções da conversa">
        <div className="grid gap-2">
          {asClient && pro && <button className="rounded-xl p-3 text-left font-semibold hover:bg-brand-50" onClick={() => go(`/p/${pro.slug}`)}>Ver perfil de {pro.displayName}</button>}
          {asClient && pro && <button className="rounded-xl p-3 text-left font-semibold hover:bg-brand-50" onClick={() => go(`/solicitar/${pro.id}`)}>Solicitar orçamento formal</button>}
          <button className="flex items-center gap-2 rounded-xl p-3 text-left font-semibold text-red-700 hover:bg-red-50" onClick={() => { setMenu(false); run(() => toggleBlock(otherId), blocked ? 'Desbloqueado' : 'Usuário bloqueado'); }}>
            <Ban className="size-4" /> {blocked ? 'Desbloquear' : 'Bloquear'} usuário
          </button>
          <button className="flex items-center gap-2 rounded-xl p-3 text-left font-semibold text-red-700 hover:bg-red-50" onClick={() => { setMenu(false); setReportT({ type: 'usuario', id: otherId }); }}>
            <Flag className="size-4" /> Denunciar usuário
          </button>
          <p className="px-3 text-xs text-muted">Você pode continuar a negociação aqui sem ser obrigado a contratar pelo app. <Badge>histórico salvo</Badge></p>
        </div>
      </Modal>
      <ReportModal target={reportT} onClose={() => setReportT(null)} />
    </div>
  );
}
