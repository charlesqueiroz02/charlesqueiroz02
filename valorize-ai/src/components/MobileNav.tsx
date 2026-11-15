import React, { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { TABS, TabId } from '../lib/tabs';

interface MobileNavProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

/** Barra inferior fixa no celular (alcance do polegar) + gaveta "Mais". */
export const MobileNav: React.FC<MobileNavProps> = ({ active, onChange }) => {
  const [more, setMore] = useState(false);
  const primary = TABS.filter(t => t.mobilePrimary);
  const rest = TABS.filter(t => !t.mobilePrimary);
  const restActive = rest.some(t => t.id === active);

  const go = (id: TabId) => { onChange(id); setMore(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <>
      {more && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMore(false)}>
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">Mais ferramentas</span>
              <button onClick={() => setMore(false)} className="p-1.5 rounded hover:bg-zinc-100" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rest.map(t => (
                <button key={t.id} onClick={() => go(t.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs ${active === t.id ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'border-zinc-200 text-zinc-700'}`}>
                  <t.icon className="w-5 h-5" />{t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-zinc-200 pb-[env(safe-area-inset-bottom)]" aria-label="Navegação principal">
        <div className="grid grid-cols-5">
          {primary.map(t => (
            <button key={t.id} onClick={() => go(t.id)} aria-current={active === t.id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active === t.id ? 'text-zinc-950' : 'text-zinc-400'}`}>
              {active === t.id && <span className="absolute top-0 inset-x-5 h-0.5 bg-emerald-600 rounded-b" />}
              <t.icon className="w-5 h-5" />
              {t.short}
              {t.isNew && <span className="absolute top-1.5 right-[calc(50%-16px)] w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          ))}
          <button onClick={() => setMore(m => !m)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${restActive || more ? 'text-zinc-950' : 'text-zinc-400'}`}>
            <MoreHorizontal className="w-5 h-5" />Mais
          </button>
        </div>
      </nav>
    </>
  );
};
