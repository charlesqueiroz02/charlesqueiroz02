import { Bell, ChevronDown, ChevronRight, MapPin, Megaphone, Search, Sprout, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AreaPicker } from '../components/AreaPicker';
import { Logo } from '../components/Logo';
import { ProCard } from '../components/ProCard';
import { useArea } from '../components/useArea';
import { Avatar, Button, CatIcon, DemoTag, PortfolioThumb, Section } from '../components/ui';
import { SEARCH_SUGGESTIONS } from '../data/catalog';
import { useStore } from '../data/store';
import { go } from '../lib/router';
import { rank } from '../lib/search';

export function Home() {
  const { db, me } = useStore();
  const area = useArea();
  const [pick, setPick] = useState(false);
  const [q, setQ] = useState('');
  const unread = me ? db.notifications.filter((n) => n.userId === me.id && !n.read).length : 0;
  const cats = db.categories.filter((c) => c.active);
  const myProId = me ? db.pros.find((p) => p.userId === me.id)?.id : undefined;

  const ranked = useMemo(() => rank(db, { q: '', neighborhood: area.neighborhood || undefined, sort: 'relevancia' }).filter((r) => r.pro.id !== myProId), [db, area.neighborhood, myProId]);
  const sponsored = ranked.find((r) => r.pro.sponsored && r.pro.plan === 'pro');
  const near = ranked.filter((r) => r !== sponsored).slice(0, 8);
  const revelation = ranked.filter((r) => r.stats.isNew && r.stats.completeness >= 0.8).slice(0, 4);
  const community = [...ranked].filter((r) => r.stats.references > 0 || r.stats.portfolioCount >= 2).sort((a, b) => b.stats.references - a.stats.references || b.stats.portfolioCount - a.stats.portfolioCount).slice(0, 5);
  const isPro = !!myProId;

  const search = (text: string) => go(`/explorar?q=${encodeURIComponent(text)}`);

  return (
    <div>
      <header className="bg-brand-800 px-4 pt-4 pb-7 text-white">
        <div className="flex items-center justify-between">
          <Logo light />
          <button onClick={() => go(me ? '/notificacoes' : '/entrar')} className="relative rounded-full p-2 hover:bg-white/10" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`}>
            <Bell className="size-6" />
            {unread > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-lime-500 px-1 text-[10px] font-bold">{unread}</span>}
          </button>
        </div>
        <button onClick={() => setPick(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
          <MapPin className="size-4 text-lime-400" />
          {area.neighborhood ? `${area.neighborhood}, ${area.city}` : 'Escolha seu bairro'}
          <ChevronDown className="size-4" />
        </button>
        <h1 className="mt-5 text-[26px] leading-tight font-extrabold">Qual serviço você precisa resolver hoje?</h1>
        <form
          className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-1.5 pl-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            search(q);
          }}
        >
          <Search className="size-5 shrink-0 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: soldador para consertar portão" className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-stone-400" aria-label="Buscar serviço" />
          <Button size="sm" className="h-10">
            Buscar
          </Button>
        </form>
        <div className="scroll-x -mx-4 mt-3 flex gap-2 px-4">
          {SEARCH_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => search(s)} className="h-8 shrink-0 rounded-full border border-white/20 px-3 text-[13px] text-white/90 hover:bg-white/10">
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="-mt-3 rounded-t-3xl bg-bg pt-5">
        <div className="grid grid-cols-4 gap-2 px-4">
          {cats.map((c) => (
            <button key={c.id} onClick={() => go(`/explorar?cat=${c.id}`)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-1 py-3 text-center hover:border-lime-500">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <CatIcon name={c.icon} className="size-5" />
              </span>
              <span className="text-[11.5px] leading-tight font-semibold">{c.name}</span>
            </button>
          ))}
        </div>

        <Section
          title="Talentos perto de você"
          action={
            <button className="text-sm font-semibold text-brand-700" onClick={() => go('/explorar')}>
              Ver todos
            </button>
          }
        >
          {!area.neighborhood && (
            <button onClick={() => setPick(true)} className="mx-4 mb-3 block text-left text-sm text-muted underline">
              Informe seu bairro para ver quem atende mais perto.
            </button>
          )}
          <div className="scroll-x flex gap-3 px-4 pb-1">
            {sponsored && <ProCard r={sponsored} categories={db.categories} sponsored />}
            {near.map((r) => (
              <ProCard key={r.pro.id} r={r} categories={db.categories} />
            ))}
          </div>
          {sponsored && <p className="mt-2 px-4 text-[11px] text-muted">Perfis "Patrocinado" pagam por destaque. Isso não altera avaliações nem selos de verificação.</p>}
        </Section>

        {revelation.length > 0 && (
          <Section title="Profissional Revelação">
            <p className="-mt-2 mb-3 px-4 text-sm text-muted">Novos na plataforma, com perfil completo e portfólio. Dê uma chance a quem está começando.</p>
            <div className="space-y-2 px-4">
              {revelation.map((r) => (
                <button key={r.pro.id} onClick={() => go(`/p/${r.pro.slug}`)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left">
                  <Avatar name={r.pro.displayName} hue={r.pro.avatarHue} photo={r.pro.photo} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-bold">
                      {r.pro.displayName} {r.pro.demo && <DemoTag />}
                    </p>
                    <p className="flex items-center gap-1 text-[13px] text-muted">
                      <Sprout className="size-3.5 text-lime-600" /> Novo · {r.stats.portfolioCount} trabalhos no portfólio
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted" />
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title="Destaques da comunidade">
          <div className="scroll-x flex gap-3 px-4">
            {community.map((r) => {
              const pics = db.portfolio.filter((p) => p.proId === r.pro.id && p.status === 'aprovado').slice(0, 3);
              return (
                <button key={r.pro.id} onClick={() => go(`/p/${r.pro.slug}`)} className="w-[250px] shrink-0 overflow-hidden rounded-2xl border border-line bg-white text-left">
                  <div className="grid h-28 grid-cols-3 gap-0.5">
                    {[0, 1, 2].map((i) => (pics[i] ? <PortfolioThumb key={i} image={pics[i]!.image} hue={pics[i]!.hue} title={pics[i]!.title} className="h-full w-full" /> : <div key={i} className="bg-brand-50" />))}
                  </div>
                  <div className="p-3">
                    <p className="flex items-center gap-1.5 truncate font-bold">
                      {r.pro.displayName} {r.pro.demo && <DemoTag />}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                      <Users className="size-3.5" /> {r.stats.references} indicação(ões) do bairro
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <div className="mx-4 mt-6 rounded-3xl border border-line bg-white p-5">
          <Megaphone className="size-6 text-lime-600" />
          <p className="mt-2 text-lg font-bold">Precisa de algo maior?</p>
          <p className="mt-1 text-sm text-muted">Publique no Mural de Oportunidades e deixe profissionais da sua região demonstrarem interesse. Você decide quem vê os detalhes.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="dark" onClick={() => go('/solicitar')}>
              Publicar necessidade
            </Button>
            <Button variant="ghost" onClick={() => go('/mural')}>
              Ver o mural
            </Button>
          </div>
        </div>

        {!isPro && (
          <div className="mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-600 p-5 text-white">
            <p className="text-xl leading-snug font-extrabold">Você tem uma habilidade? Transforme seu talento em oportunidade.</p>
            <p className="mt-2 text-sm text-white/80">Perfil gratuito, sem comissão sobre os serviços que você conquistar.</p>
            <Button className="mt-4" onClick={() => go(me ? '/perfil/vitrine' : '/cadastro')}>
              Quero oferecer meus serviços
            </Button>
          </div>
        )}
        <p className="mt-8 px-6 text-center text-xs text-muted">
          Perfis marcados como <b>Fictício</b> são dados de demonstração e não representam pessoas reais.
        </p>
      </div>
      <AreaPicker open={pick} onClose={() => setPick(false)} city={area.city} neighborhood={area.neighborhood} onSave={area.set} />
    </div>
  );
}
