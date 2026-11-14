import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';

interface Suggestion { ticker: string; name: string; sector?: string }

interface AddTickerFieldProps {
  selected: string[];
  onAdd: (ticker: string, info: { name: string; price?: number; sector?: string }) => void;
}

/**
 * Campo para incluir QUALQUER papel da B3 (não só os sugeridos).
 * Sugere enquanto digita e confere a cotação antes de adicionar.
 */
export const AddTickerField: React.FC<AddTickerFieldProps> = ({ selected, onAdd }) => {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sugestões com atraso de 250 ms (não dispara a cada letra)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setList([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/stock/search?q=${encodeURIComponent(term)}`)
        .then(r => (r.ok ? r.json() : []))
        .then((d: Suggestion[]) => {
          const valid = (Array.isArray(d) ? d : []).filter(s => /^[A-Z]{4}\d{1,2}$/.test(s.ticker) && !selected.includes(s.ticker));
          setList(valid.slice(0, 6));
          setOpen(true);
        })
        .catch(() => setList([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, selected]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const add = async (raw: string, name?: string, sector?: string) => {
    const ticker = raw.trim().toUpperCase().replace(/\.SA$/, '');
    setMsg(null);
    if (!/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
      setMsg({ type: 'err', text: 'Use o código da B3, ex.: KLBN11, CMIG4, WEGE3.' });
      return;
    }
    if (selected.includes(ticker)) {
      setMsg({ type: 'err', text: `${ticker} já está na sua lista.` });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/stock/${ticker}`);
      if (r.status === 404) {
        setMsg({ type: 'err', text: `Não encontramos ${ticker} na B3. Confira o código.` });
        return;
      }
      const d = r.ok ? await r.json() : null;
      onAdd(ticker, {
        name: d?.companyName || name || ticker,
        price: d?.currentPrice > 0 ? d.currentPrice : undefined,
        sector: d?.sector?.sectorName || sector,
      });
      setMsg({ type: 'ok', text: d?.currentPrice ? `${ticker} incluído (R$ ${Number(d.currentPrice).toFixed(2)}).` : `${ticker} incluído.` });
    } catch {
      // Sem internet: inclui mesmo assim; a cotação vem depois
      onAdd(ticker, { name: name || ticker, sector });
      setMsg({ type: 'ok', text: `${ticker} incluído. A cotação será buscada quando houver internet.` });
    } finally {
      setBusy(false);
      setQ('');
      setList([]);
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs font-bold text-zinc-800 mb-1.5">Adicionar outro papel</label>
      <form
        onSubmit={e => { e.preventDefault(); if (q.trim()) add(q); }}
        className="flex gap-2"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value.toUpperCase()); setMsg(null); }}
            onFocus={() => list.length && setOpen(true)}
            placeholder="Código ou nome: KLBN11, Klabin…"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-3 bg-white border border-zinc-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            aria-label="Código do papel para adicionar"
          />
        </div>
        <button
          type="submit"
          disabled={!q.trim() || busy}
          className="shrink-0 px-4 py-3 bg-zinc-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Incluir
        </button>
      </form>

      {open && list.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
          {list.map(s => (
            <li key={s.ticker}>
              <button
                type="button"
                onClick={() => add(s.ticker, s.name, s.sector)}
                className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="font-mono font-bold text-sm text-zinc-900">{s.ticker}</span>
                  <span className="block text-[11px] text-zinc-500 truncate">{s.name}</span>
                </span>
                <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <p className={`text-[11px] mt-1.5 ${msg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>
      )}
    </div>
  );
};
