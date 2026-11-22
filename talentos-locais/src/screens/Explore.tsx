import { MapPin, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AreaPicker } from '../components/AreaPicker';
import { ProCard } from '../components/ProCard';
import { useArea } from '../components/useArea';
import { Button, Chip, EmptyState, Field, Modal, inputCls } from '../components/ui';
import { MODE_LABEL } from '../data/catalog';
import { useStore } from '../data/store';
import { go, query } from '../lib/router';
import { interpret, rank, type Filters, type SortKey } from '../lib/search';

const SORTS: [SortKey, string][] = [
  ['relevancia', 'Mais relevante'],
  ['proximo', 'Mais próximo'],
  ['avaliacao', 'Melhor avaliado'],
  ['disponivel', 'Disponível primeiro'],
  ['preco', 'Menor preço informado'],
];

type F = Omit<Filters, 'q' | 'neighborhood' | 'sort'>;

export function Explore() {
  const { db } = useStore();
  const area = useArea();
  const [q, setQ] = useState(() => query().get('q') ?? '');
  const [applied, setApplied] = useState(q);
  const [f, setF] = useState<F>(() => ({ category: query().get('cat') ?? undefined }));
  const [sort, setSort] = useState<SortKey>('relevancia');
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState(false);
  const catNames = Object.fromEntries(db.categories.map((c) => [c.id, c.name]));

  const it = useMemo(() => (applied.trim() ? interpret(applied, catNames) : null), [applied]); // eslint-disable-line

  // Converte a interpretação em filtros (o usuário pode remover cada um)
  useEffect(() => {
    if (!it) return;
    setF((x) => ({
      ...x,
      category: it.categories.length === 1 ? it.categories[0] : x.category,
      urgent: it.urgent || undefined,
      availability: !it.urgent && it.thisWeek ? 'semana' : x.availability,
      mode: it.remote ? 'remoto' : x.mode,
    }));
    if (it.nearMe) setSort('proximo');
  }, [it]);

  const results = useMemo(() => rank(db, { ...f, q: applied, neighborhood: area.neighborhood || undefined, sort }), [db, f, applied, area.neighborhood, sort]);
  const sponsored = sort === 'relevancia' ? results.find((r) => r.pro.sponsored && r.pro.plan === 'pro') : undefined;
  const organic = results.filter((r) => r !== sponsored);

  const active: [string, () => void][] = [];
  if (f.category) active.push([catNames[f.category] ?? f.category, () => setF({ ...f, category: undefined })]);
  if (f.urgent) active.push(['Atendimento urgente', () => setF({ ...f, urgent: undefined })]);
  if (f.availability) active.push([f.availability === 'hoje' ? 'Disponível hoje' : 'Nesta semana', () => setF({ ...f, availability: undefined })]);
  if (f.mode) active.push([MODE_LABEL[f.mode]!, () => setF({ ...f, mode: undefined })]);
  if (f.maxKm !== undefined) active.push([`Até ${f.maxKm} km`, () => setF({ ...f, maxKm: undefined })]);
  if (f.maxPrice !== undefined) active.push([`Até R$ ${f.maxPrice}`, () => setF({ ...f, maxPrice: undefined })]);
  if (f.minRating) active.push([`Nota ${f.minRating}+`, () => setF({ ...f, minRating: undefined })]);
  if (f.minReviews) active.push([`${f.minReviews}+ avaliações`, () => setF({ ...f, minReviews: undefined })]);
  if (f.hasPortfolio) active.push(['Com portfólio', () => setF({ ...f, hasPortfolio: undefined })]);
  if (f.verified) active.push(['Identidade verificada', () => setF({ ...f, verified: undefined })]);

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-line bg-bg/95 px-4 pt-3 pb-3 backdrop-blur">
        <form
          className="flex items-center gap-2 rounded-2xl border border-line bg-white p-1.5 pl-3"
          onSubmit={(e) => {
            e.preventDefault();
            setF({});
            setApplied(q);
          }}
        >
          <Search className="size-5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Descreva o que precisa…" className="min-w-0 flex-1 bg-transparent py-1.5 outline-none" aria-label="Buscar" />
          {q && (
            <button type="button" aria-label="Limpar busca" onClick={() => { setQ(''); setApplied(''); setF({}); }} className="p-1 text-muted">
              <X className="size-4" />
            </button>
          )}
          <Button size="sm">Buscar</Button>
        </form>
        <div className="mt-2.5 flex items-center gap-2">
          <button onClick={() => setPick(true)} className="inline-flex min-w-0 flex-1 items-center gap-1 text-sm font-medium text-brand-700">
            <MapPin className="size-4 shrink-0" /> <span className="truncate">{area.neighborhood || 'Escolher bairro'}</span>
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 w-40 shrink-0 rounded-full border border-line bg-white px-3 text-sm" aria-label="Ordenar">
            {SORTS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => setSheet(true)} icon={<SlidersHorizontal className="size-4" />}>
            Filtros{active.length ? ` (${active.length})` : ''}
          </Button>
        </div>
      </div>

      {it && it.chips.length > 0 && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <p>
            <b>Entendi:</b> {it.chips.join(' · ')}
          </p>
        </div>
      )}
      {active.length > 0 && (
        <div className="scroll-x mt-3 flex gap-2 px-4">
          {active.map(([label, rm]) => (
            <button key={label} onClick={rm} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-800 px-3 text-[13px] font-medium text-white">
              {label} <X className="size-3.5" />
            </button>
          ))}
        </div>
      )}
      {!f.category && !applied && (
        <div className="scroll-x mt-3 flex gap-2 px-4">
          {db.categories.filter((c) => c.active).map((c) => (
            <Chip key={c.id} onClick={() => setF({ ...f, category: c.id })}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      <p className="mt-4 px-4 text-sm text-muted">{organic.length + (sponsored ? 1 : 0)} profissional(is) encontrado(s)</p>
      <div className="mt-2 space-y-3 px-4">
        {sponsored && <ProCard r={sponsored} categories={db.categories} sponsored wide />}
        {organic.map((r) => (
          <ProCard key={r.pro.id} r={r} categories={db.categories} wide />
        ))}
      </div>
      {!results.length && (
        <EmptyState
          icon={<Search />}
          title="Nenhum profissional encontrado"
          text="Tente remover alguns filtros, buscar com outras palavras ou publique sua necessidade no Mural para que profissionais te encontrem."
          action={
            <Button variant="dark" onClick={() => go('/solicitar')}>
              Publicar no Mural
            </Button>
          }
        />
      )}

      <Modal open={sheet} onClose={() => setSheet(false)} title="Filtros">
        <FilterForm value={f} onApply={(v) => { setF(v); setSheet(false); }} />
      </Modal>
      <AreaPicker open={pick} onClose={() => setPick(false)} city={area.city} neighborhood={area.neighborhood} onSave={area.set} />
    </div>
  );
}

function FilterForm({ value, onApply }: { value: F; onApply: (f: F) => void }) {
  const { db } = useStore();
  const [f, setF] = useState<F>(value);
  const num = (s: string) => (s === '' ? undefined : Number(s));
  return (
    <div className="space-y-5">
      <Field label="Categoria">
        <select className={inputCls} value={f.category ?? ''} onChange={(e) => setF({ ...f, category: e.target.value || undefined })}>
          <option value="">Todas</option>
          {db.categories.filter((c) => c.active).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold">Disponibilidade</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!f.availability} onClick={() => setF({ ...f, availability: undefined })}>Qualquer</Chip>
          <Chip active={f.availability === 'hoje'} onClick={() => setF({ ...f, availability: 'hoje' })}>Hoje</Chip>
          <Chip active={f.availability === 'semana'} onClick={() => setF({ ...f, availability: 'semana' })}>Nesta semana</Chip>
          <Chip active={!!f.urgent} onClick={() => setF({ ...f, urgent: f.urgent ? undefined : true })}>Atende urgência</Chip>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Atendimento</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!f.mode} onClick={() => setF({ ...f, mode: undefined })}>Qualquer</Chip>
          {(['local', 'estabelecimento', 'remoto'] as const).map((m) => (
            <Chip key={m} active={f.mode === m} onClick={() => setF({ ...f, mode: m })}>{MODE_LABEL[m]}</Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Distância máx. (km)" hint="Aproximada, entre bairros">
          <input className={inputCls} type="number" min={0} value={f.maxKm ?? ''} onChange={(e) => setF({ ...f, maxKm: num(e.target.value) })} />
        </Field>
        <Field label="Preço inicial até (R$)">
          <input className={inputCls} type="number" min={0} value={f.maxPrice ?? ''} onChange={(e) => setF({ ...f, maxPrice: num(e.target.value) })} />
        </Field>
        <Field label="Nota mínima">
          <select className={inputCls} value={f.minRating ?? ''} onChange={(e) => setF({ ...f, minRating: num(e.target.value) })}>
            <option value="">Qualquer</option>
            <option value="4">4+</option>
            <option value="4.5">4,5+</option>
          </select>
        </Field>
        <Field label="Mín. de avaliações">
          <select className={inputCls} value={f.minReviews ?? ''} onChange={(e) => setF({ ...f, minReviews: num(e.target.value) })}>
            <option value="">Qualquer</option>
            <option value="1">1+</option>
            <option value="3">3+</option>
            <option value="10">10+</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active={!!f.hasPortfolio} onClick={() => setF({ ...f, hasPortfolio: f.hasPortfolio ? undefined : true })}>Com portfólio</Chip>
        <Chip active={!!f.verified} onClick={() => setF({ ...f, verified: f.verified ? undefined : true })}>Identidade verificada</Chip>
      </div>
      <p className="text-xs text-muted">Profissionais sem avaliações continuam aparecendo, exceto se você filtrar por nota ou quantidade de avaliações.</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setF({})}>Limpar</Button>
        <Button className="flex-1" onClick={() => onApply(f)}>Aplicar</Button>
      </div>
    </div>
  );
}
