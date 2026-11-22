import {
  Award, BadgeCheck, Bookmark, BookmarkCheck, Clock, Flag, GraduationCap, Handshake, MapPin, MessageCircle, Pencil, Share2, Sprout, Users, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Check } from './Auth';
import { ReportModal } from '../components/ReportModal';
import {
  Avatar, Badge, Button, Card, Chip, DemoTag, EmptyState, Field, Modal, Notice, PortfolioThumb, Stars, TopBar, TrustRow, inputCls, toast, useAction,
} from '../components/ui';
import { addReference, contestReview, openConversation, recordView, replyReview, toggleSave } from '../data/actions';
import { AVAILABILITY_LABEL, MODE_LABEL } from '../data/catalog';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { proStats, reviewScore } from '../lib/search';
import { brl, cx, fmtDate } from '../lib/utils';
import type { ReportTarget, Review } from '../types';

type Tab = 'sobre' | 'portfolio' | 'avaliacoes' | 'indicacoes' | 'passaporte';

export function ProProfileScreen({ slug }: { slug: string }) {
  const { db, me } = useStore();
  const pro = db.pros.find((p) => p.slug === slug);
  const [tab, setTab] = useState<Tab>('sobre');
  const [reportT, setReportT] = useState<{ type: ReportTarget; id: string } | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const { run } = useAction();

  useEffect(() => {
    if (pro) recordView(pro.id);
  }, [pro?.id]); // eslint-disable-line

  const stats = useMemo(() => (pro ? proStats(db, pro) : null), [db, pro]);
  const owner = !!me && pro?.userId === me.id;
  const ownerUser = pro && db.users.find((u) => u.id === pro.userId);
  if (!pro || !stats || (!pro.published && !owner) || ownerUser?.status !== 'active')
    return (
      <>
        <TopBar title="Perfil" back="/explorar" />
        <EmptyState title="Perfil indisponível" text="Este perfil não existe, foi despublicado ou está em análise." />
      </>
    );

  const saved = me?.saved.includes(pro.id);
  const needLogin = (fn: () => void) => () => (me ? fn() : go('/entrar'));
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/p/${pro.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: pro.displayName, text: `${pro.displayName} no TalentosLocais`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link do perfil copiado!');
      }
    } catch {
      /* cancelado */
    }
  };
  const catNames = pro.categories.map((c) => db.categories.find((x) => x.id === c)?.name);

  return (
    <div>
      <TopBar
        title={pro.displayName}
        back={true}
        right={
          <button aria-label="Compartilhar perfil" onClick={share} className="rounded-full p-2 hover:bg-brand-50">
            <Share2 className="size-5" />
          </button>
        }
      />
      <div className="px-4 pt-4">
        {!pro.published && <Notice tone="warn">Seu perfil está oculto das buscas.</Notice>}
        <div className="flex gap-4">
          <Avatar name={pro.displayName} hue={pro.avatarHue} photo={pro.photo} size={84} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {pro.demo && <DemoTag />}
              {stats.isNew && (
                <Badge tone="lime">
                  <Sprout className="size-3" /> Novo na plataforma
                </Badge>
              )}
            </div>
            <h1 className="mt-1 text-xl leading-tight font-extrabold">{pro.displayName}</h1>
            <p className="text-sm text-muted">{catNames.join(' · ')}</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              {stats.reviewCount ? (
                <>
                  <Stars value={stats.avg!} /> <b>{stats.avg!.toFixed(1)}</b> <span className="text-muted">({stats.reviewCount} avaliações)</span>
                </>
              ) : (
                <span className="text-muted">Ainda sem avaliações</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <TrustRow identity={pro.identityVerified} confirmedJobs={stats.confirmedJobs} references={stats.references} />
        </div>
        <div className="mt-3 grid gap-1.5 text-sm text-muted">
          <span className="flex items-center gap-2">
            <MapPin className="size-4" /> Atende: {pro.neighborhoods.join(', ')} · {pro.city}
          </span>
          <span className={cx('flex items-center gap-2', pro.availability === 'hoje' && 'font-semibold text-lime-600')}>
            <Clock className="size-4" /> {AVAILABILITY_LABEL[pro.availability]}
            {pro.urgent && (
              <>
                {' '}
                · <Zap className="size-4" /> atende urgências
              </>
            )}
          </span>
          <span className="flex items-center gap-2">
            <Award className="size-4" /> {pro.experienceYears} anos de experiência (declarado)
          </span>
          <span className="flex items-center gap-2">
            <Handshake className="size-4" /> {pro.modes.map((m) => MODE_LABEL[m]).join(' · ')}
          </span>
        </div>

        {owner ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="dark" icon={<Pencil className="size-4" />} onClick={() => go('/perfil/vitrine')}>
              Editar vitrine
            </Button>
            <Button variant="secondary" icon={<Share2 className="size-4" />} onClick={share}>
              Divulgar meu link
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button className="col-span-3" size="lg" onClick={needLogin(() => go(`/solicitar/${pro.id}`))}>Solicitar orçamento</Button>
            <Button
              variant="secondary"
              icon={<MessageCircle className="size-4" />}
              onClick={needLogin(async () => {
                const id = await run(() => openConversation(pro.id));
                if (id) go(`/mensagens/${id}`);
              })}
            >
              Mensagem
            </Button>
            <Button variant="secondary" onClick={needLogin(() => run(() => toggleSave(pro.id), saved ? 'Removido dos salvos' : 'Profissional salvo'))}>
              {saved ? <BookmarkCheck className="size-5 text-lime-600" /> : <Bookmark className="size-5" />} {saved ? 'Salvo' : 'Salvar'}
            </Button>
            <Button variant="secondary" icon={<Share2 className="size-4" />} onClick={share}>
              Compartilhar
            </Button>
          </div>
        )}
      </div>

      <div className="scroll-x sticky top-14 z-20 mt-5 flex gap-1 border-b border-line bg-bg px-3">
        {(
          [
            ['sobre', 'Sobre'],
            ['portfolio', `Portfólio (${stats.portfolioCount})`],
            ['avaliacoes', `Avaliações (${stats.reviewCount})`],
            ['indicacoes', `Indicações (${stats.references})`],
            ['passaporte', 'Passaporte'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('shrink-0 border-b-2 px-3 py-3 text-sm font-semibold', tab === k ? 'border-lime-500 text-brand-800' : 'border-transparent text-muted')}>
            {l}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'sobre' && (
          <div className="space-y-4">
            <p className="leading-relaxed whitespace-pre-line">{pro.bio || 'O profissional ainda não escreveu uma apresentação.'}</p>
            <Card className="divide-y divide-line">
              {pro.services.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3.5">
                  <span className="font-medium">{s.name}</span>
                  <span className="shrink-0 text-sm text-muted">{s.priceFrom !== undefined ? `a partir de ${brl(s.priceFrom)}${s.unit ? ` ${s.unit}` : ''}` : 'sob orçamento'}</span>
                </div>
              ))}
            </Card>
            <p className="text-xs text-muted">Preços iniciais informados pelo profissional. O valor final é combinado no orçamento.</p>
          </div>
        )}
        {tab === 'portfolio' && <Portfolio proId={pro.id} owner={owner} onReport={(id) => setReportT({ type: 'foto', id })} />}
        {tab === 'avaliacoes' && <Reviews proId={pro.id} owner={owner} onReport={(id) => setReportT({ type: 'avaliacao', id })} />}
        {tab === 'indicacoes' && (
          <References
            proId={pro.id}
            canAdd={!owner}
            onAdd={needLogin(() => setRefOpen(true))}
            onReport={(id) => setReportT({ type: 'referencia', id })}
          />
        )}
        {tab === 'passaporte' && <Passport proId={pro.id} />}

        {!owner && (
          <button onClick={needLogin(() => setReportT({ type: 'perfil', id: pro.id }))} className="mt-8 flex items-center gap-1.5 text-sm text-muted underline">
            <Flag className="size-4" /> Denunciar este perfil
          </button>
        )}
      </div>
      <ReportModal target={reportT} onClose={() => setReportT(null)} />
      <ReferenceModal open={refOpen} onClose={() => setRefOpen(false)} proId={pro.id} name={pro.displayName} />
    </div>
  );
}

function Portfolio({ proId, owner, onReport }: { proId: string; owner: boolean; onReport: (id: string) => void }) {
  const { db, me } = useStore();
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const items = db.portfolio.filter((p) => p.proId === proId && (p.status === 'aprovado' || (owner && p.status === 'pendente')));
  const cats = [...new Set(items.map((i) => i.category))];
  const shown = items.filter((i) => !cat || i.category === cat);
  const item = items.find((i) => i.id === open);
  if (!items.length) return <EmptyState title="Portfólio ainda vazio" text={owner ? 'Adicione fotos de trabalhos para mostrar sua qualidade.' : 'Peça fotos de trabalhos semelhantes pela mensagem.'} />;
  return (
    <>
      {cats.length > 1 && (
        <div className="scroll-x mb-3 flex gap-2">
          <Chip active={!cat} onClick={() => setCat(null)}>Todos</Chip>
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {db.categories.find((x) => x.id === c)?.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {shown.map((p) => (
          <button key={p.id} onClick={() => setOpen(p.id)} className="overflow-hidden rounded-2xl border border-line bg-white text-left">
            <PortfolioThumb image={p.image} hue={p.hue} title={p.title} className="aspect-square w-full" />
            <div className="p-2.5">
              <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted">
                {p.approxDate} {p.beforeImage && '· antes/depois'}
              </p>
              {p.status === 'pendente' && <Badge tone="amber" className="mt-1">Em moderação</Badge>}
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!item} onClose={() => setOpen(null)} title={item?.title ?? ''}>
        {item && (
          <div className="space-y-3">
            {item.beforeImage ? (
              <div className="grid grid-cols-2 gap-2">
                <figure>
                  <PortfolioThumb image={item.beforeImage} hue={item.hue} title="Antes" className="aspect-square w-full rounded-xl" />
                  <figcaption className="mt-1 text-center text-xs font-semibold">Antes</figcaption>
                </figure>
                <figure>
                  <PortfolioThumb image={item.image} hue={item.hue} title="Depois" className="aspect-square w-full rounded-xl" />
                  <figcaption className="mt-1 text-center text-xs font-semibold">Depois</figcaption>
                </figure>
              </div>
            ) : (
              <PortfolioThumb image={item.image} hue={item.hue} title={item.title} className="aspect-[4/3] w-full rounded-xl" />
            )}
            <p>{item.description}</p>
            <p className="text-sm text-muted">
              {db.categories.find((c) => c.id === item.category)?.name} · aproximadamente {item.approxDate}
            </p>
            {!owner && me && (
              <button onClick={() => { setOpen(null); onReport(item.id); }} className="text-sm text-muted underline">
                Denunciar foto
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

const CRITERIA: [keyof Review['ratings'], string][] = [
  ['quality', 'Qualidade do trabalho'],
  ['punctuality', 'Pontualidade'],
  ['communication', 'Comunicação'],
  ['agreement', 'Cumprimento do combinado'],
  ['value', 'Custo-benefício'],
];

function Reviews({ proId, owner, onReport }: { proId: string; owner: boolean; onReport: (id: string) => void }) {
  const { db, me } = useStore();
  const reviews = db.reviews.filter((r) => r.proId === proId && r.status !== 'removida').sort((a, b) => b.createdAt - a.createdAt);
  const [reply, setReply] = useState<{ id: string; mode: 'reply' | 'contest' } | null>(null);
  const [text, setText] = useState('');
  const { busy, run } = useAction();
  if (!reviews.length)
    return <EmptyState icon={<Sprout />} title="Ainda sem avaliações" text="Avaliações só podem ser feitas por quem contratou pelo app. Não ter avaliações não significa baixa qualidade." />;
  const avg = (k: keyof Review['ratings']) => reviews.reduce((a, r) => a + r.ratings[k], 0) / reviews.length;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        {CRITERIA.map(([k, l]) => (
          <div key={k} className="flex items-center justify-between py-1 text-sm">
            <span>{l}</span>
            <span className="flex items-center gap-2">
              <Stars value={avg(k)} size={13} /> <b className="w-7 text-right">{avg(k).toFixed(1)}</b>
            </span>
          </div>
        ))}
      </Card>
      <Notice>Todas as avaliações abaixo vêm de pedidos concluídos dentro do app. Profissionais não podem pagar para remover críticas.</Notice>
      {reviews.map((r) => {
        const author = db.users.find((u) => u.id === r.clientId);
        return (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {author?.name ?? 'Usuário'} {r.demo && <DemoTag />}
              </span>
              <span className="text-xs text-muted">{fmtDate(r.createdAt)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={reviewScore(r)} />
              <Badge tone="blue">
                <Handshake className="size-3" /> Contratação confirmada
              </Badge>
              {r.status === 'contestada' && <Badge tone="amber">Em análise pela moderação</Badge>}
            </div>
            {r.comment && <p className="mt-2 text-[15px]">{r.comment}</p>}
            {r.proReply && (
              <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm">
                <b>Resposta do profissional:</b> {r.proReply}
              </div>
            )}
            <div className="mt-2 flex gap-4 text-sm">
              {owner && !r.proReply && (
                <button className="font-semibold text-brand-700" onClick={() => { setReply({ id: r.id, mode: 'reply' }); setText(''); }}>
                  Responder
                </button>
              )}
              {owner && r.status === 'publicada' && (
                <button className="text-muted underline" onClick={() => { setReply({ id: r.id, mode: 'contest' }); setText(''); }}>
                  Contestar
                </button>
              )}
              {!owner && me && me.id !== r.clientId && (
                <button className="text-muted underline" onClick={() => onReport(r.id)}>
                  Denunciar
                </button>
              )}
            </div>
          </Card>
        );
      })}
      <Modal open={!!reply} onClose={() => setReply(null)} title={reply?.mode === 'reply' ? 'Responder avaliação' : 'Contestar avaliação'}>
        {reply?.mode === 'contest' && <p className="mb-3 text-sm text-muted">A avaliação continua visível (marcada "em análise") até a decisão da moderação. Explique o motivo com fatos.</p>}
        <textarea className={inputCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <Button
          className="mt-3 w-full"
          loading={busy}
          onClick={async () => {
            const ok = await run(() => {
              if (reply!.mode === 'reply') replyReview(reply!.id, text);
              else contestReview(reply!.id, text);
              return true;
            }, reply!.mode === 'reply' ? 'Resposta publicada' : 'Contestação enviada para moderação');
            if (ok) setReply(null);
          }}
        >
          Enviar
        </Button>
      </Modal>
    </div>
  );
}

function References({ proId, canAdd, onAdd, onReport }: { proId: string; canAdd: boolean; onAdd: () => void; onReport: (id: string) => void }) {
  const { db, me } = useStore();
  const refs = db.references.filter((r) => r.proId === proId && r.status === 'publicada');
  return (
    <div className="space-y-3">
      <Notice>
        <b>Indicação do Bairro</b> é uma recomendação de quem conhece o profissional. Ela <b>não</b> comprova contratação — para isso, veja as avaliações.
      </Notice>
      {canAdd && (
        <Button variant="secondary" className="w-full" icon={<Users className="size-4" />} onClick={onAdd}>
          Indicar este profissional
        </Button>
      )}
      {!refs.length && <EmptyState icon={<Users />} title="Nenhuma indicação ainda" />}
      {refs.map((r) => {
        const author = db.users.find((u) => u.id === r.authorId);
        const hasOrder = db.orders.some((o) => o.proId === proId && o.clientId === r.authorId && ['concluido', 'avaliacao_pendente', 'encerrado'].includes(o.status));
        return (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{r.showAuthorName ? author?.name : 'Morador da região (nome oculto)'}</span>
              {r.demo && <DemoTag />}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="violet">
                <Users className="size-3" /> Indicação do bairro
              </Badge>
              {r.relation === 'contratou' ? (
                hasOrder ? (
                  <Badge tone="blue">Contratou pelo app (confirmado)</Badge>
                ) : (
                  <Badge tone="neutral">Declara já ter contratado (não confirmado)</Badge>
                )
              ) : (
                <Badge tone="neutral">Conhece pessoalmente</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">Como conhece: {r.howKnows}</p>
            <p className="mt-1">{r.text}</p>
            {me && me.id !== r.authorId && (
              <button className="mt-2 text-sm text-muted underline" onClick={() => onReport(r.id)}>
                Denunciar
              </button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ReferenceModal({ open, onClose, proId, name }: { open: boolean; onClose: () => void; proId: string; name: string }) {
  const [f, setF] = useState({ relation: 'conhece' as 'conhece' | 'contratou', howKnows: '', text: '', showAuthorName: false, consentPublish: false });
  const { busy, run } = useAction();
  return (
    <Modal open={open} onClose={onClose} title={`Indicar ${name}`}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold">Qual é a sua relação?</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={f.relation === 'conhece'} onClick={() => setF({ ...f, relation: 'conhece' })}>Conheço pessoalmente</Chip>
            <Chip active={f.relation === 'contratou'} onClick={() => setF({ ...f, relation: 'contratou' })}>Já contratei os serviços</Chip>
          </div>
        </div>
        <Field label="Como você conhece o profissional?">
          <input className={inputCls} value={f.howKnows} onChange={(e) => setF({ ...f, howKnows: e.target.value })} placeholder="Ex.: vizinho há 5 anos" />
        </Field>
        <Field label="Sua recomendação">
          <textarea className={inputCls} rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
        </Field>
        <div className="space-y-2 text-sm">
          <Check checked={f.showAuthorName} onChange={(v) => setF({ ...f, showAuthorName: v })}>
            Mostrar meu nome de exibição (se desmarcado, aparece "Morador da região")
          </Check>
          <Check checked={f.consentPublish} onChange={(v) => setF({ ...f, consentPublish: v })}>
            Autorizo a publicação desta recomendação no perfil do profissional
          </Check>
        </div>
        <Button
          className="w-full"
          loading={busy}
          onClick={async () => {
            const ok = await run(() => {
              addReference(proId, f);
              return true;
            }, 'Indicação publicada. Obrigado!');
            if (ok) onClose();
          }}
        >
          Publicar indicação
        </Button>
      </div>
    </Modal>
  );
}

function Passport({ proId }: { proId: string }) {
  const { db } = useStore();
  const pro = db.pros.find((p) => p.id === proId)!;
  const stats = proStats(db, pro);
  const done = db.orders.filter((o) => o.proId === proId && ['concluido', 'avaliacao_pendente', 'encerrado'].includes(o.status));
  const byCat: Record<string, number> = {};
  done.forEach((o) => {
    const r = db.requests.find((x) => x.id === o.requestId);
    if (r) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  });
  const KIND: Record<string, string> = { curso: 'Curso', formacao: 'Formação', certificacao: 'Certificação', registro: 'Registro profissional' };
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-brand-800 to-brand-600 p-5 text-white">
        <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">Passaporte de Habilidades</p>
        <p className="mt-1 text-xl font-extrabold">{pro.displayName}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-2">
            <p className="text-2xl font-extrabold">{pro.experienceYears}</p>
            <p className="text-[11px] text-white/80">anos (declarado)</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <p className="text-2xl font-extrabold">{stats.confirmedJobs}</p>
            <p className="text-[11px] text-white/80">serviços confirmados</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <p className="text-2xl font-extrabold">{stats.portfolioCount}</p>
            <p className="text-[11px] text-white/80">trabalhos no portfólio</p>
          </div>
        </div>
      </div>
      <Card className="p-4">
        <p className="font-bold">Especialidades</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {pro.categories.map((c) => (
            <Badge key={c} tone="green">
              {db.categories.find((x) => x.id === c)?.name}
              {byCat[c] ? ` · ${byCat[c]} serviço(s) confirmado(s)` : ''}
            </Badge>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <p className="font-bold">Cursos e qualificações</p>
        {!pro.credentials.length && <p className="mt-1 text-sm text-muted">Nenhuma qualificação informada.</p>}
        <ul className="mt-2 space-y-2">
          {pro.credentials.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3">
              <span className="flex items-start gap-2 text-sm">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  {c.name} <span className="text-muted">· {KIND[c.kind]}</span>
                </span>
              </span>
              {c.status === 'verificado' ? (
                <Badge tone="green">
                  <BadgeCheck className="size-3" /> Verificado
                </Badge>
              ) : (
                <Badge tone="neutral">Informado pelo profissional</Badge>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          "Informado pelo profissional" significa que o TalentosLocais não conferiu o documento. Para atividades regulamentadas, confirme a habilitação diretamente com o profissional e o órgão responsável.
        </p>
      </Card>
      <Card className="p-4 text-sm">
        <p className="font-bold">Verificações</p>
        <ul className="mt-2 space-y-1.5">
          <li>Identidade: {pro.identityVerified ? <b className="text-brand-700">verificada pela equipe</b> : 'não verificada'}</li>
          <li>Telefone de contato: {pro.contactVerified ? 'confirmado' : 'não confirmado'} <span className="text-muted">(confirmar telefone não comprova identidade)</span></li>
        </ul>
      </Card>
    </div>
  );
}
