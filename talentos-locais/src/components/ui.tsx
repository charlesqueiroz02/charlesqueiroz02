import {
  AlertTriangle, BadgeCheck, BrickWall, Car, ChevronLeft, Flame, Handshake, Home, Image as ImageIcon, Laptop, Loader2, Scissors, ShieldCheck,
  Sparkles, Star, Users, Wrench, X,
} from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AppError } from '../data/store';
import { go } from '../lib/router';
import { cx, initials } from '../lib/utils';

// ------------------------------------------------------------ toast + ações assíncronas
type Toast = { id: number; text: string; tone: 'ok' | 'err' };
let pushToast: (t: Omit<Toast, 'id'>) => void = () => {};
export const toast = (text: string, tone: Toast['tone'] = 'ok') => pushToast({ text, tone });

export function Toasts() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random();
      setList((l) => [...l.slice(-1), { ...t, id }]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4200);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={cx('pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-lg', t.tone === 'ok' ? 'bg-brand-800 text-white' : 'bg-red-600 text-white')}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export const errMsg = (e: unknown) => (e instanceof AppError ? e.message : 'Algo deu errado. Tente novamente.');

/** Executa uma ação mostrando carregamento, sucesso e erro. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async <T,>(fn: () => T | Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) toast(ok);
      return r;
    } catch (e) {
      if (!(e instanceof AppError)) console.error(e);
      toast(errMsg(e), 'err');
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

// ------------------------------------------------------------ básicos
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
};
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-[15px]',
        size === 'lg' && 'h-13 px-5 text-base',
        variant === 'primary' && 'bg-lime-500 text-white hover:bg-lime-600',
        variant === 'dark' && 'bg-brand-800 text-white hover:bg-brand-900',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-brand-50',
        variant === 'ghost' && 'text-brand-700 hover:bg-brand-50',
        variant === 'danger' && 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export const Card = ({ className, children, ...p }: { className?: string; children: ReactNode; onClick?: () => void }) => (
  <div {...p} className={cx('rounded-2xl border border-line bg-card', p.onClick && 'cursor-pointer hover:border-brand-200', className)}>
    {children}
  </div>
);

export const Badge = ({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'green' | 'lime' | 'amber' | 'red' | 'blue' | 'violet'; children: ReactNode; className?: string }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
      tone === 'neutral' && 'bg-stone-100 text-stone-700',
      tone === 'green' && 'bg-brand-50 text-brand-700',
      tone === 'lime' && 'bg-lime-400/15 text-lime-600',
      tone === 'amber' && 'bg-amber-50 text-amber-800',
      tone === 'red' && 'bg-red-50 text-red-700',
      tone === 'blue' && 'bg-sky-50 text-sky-800',
      tone === 'violet' && 'bg-violet-50 text-violet-800',
      className,
    )}
  >
    {children}
  </span>
);

export const DemoTag = () => (
  <Badge tone="amber" className="!text-[10px] uppercase tracking-wide" >
    Fictício
  </Badge>
);

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none placeholder:text-stone-400 focus:border-lime-500 focus:ring-2 focus:ring-lime-400/30';

export function Avatar({ name, hue, photo, size = 48 }: { name: string; hue: number; photo?: string; size?: number }) {
  if (photo) return <img src={photo} alt="" className="shrink-0 rounded-2xl object-cover" style={{ width: size, height: size }} />;
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-2xl font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 45% 38%), hsl(${(hue + 40) % 360} 50% 30%))` }}
    >
      {initials(name)}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />
      ))}
    </span>
  );
}

export function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} estrela${i > 1 ? 's' : ''}`} onClick={() => onChange(i)} className="p-1">
            <Star className={cx('size-7', i <= value ? 'fill-amber-400 text-amber-400' : 'text-stone-300')} />
          </button>
        ))}
      </div>
    </div>
  );
}

const CAT_ICONS: Record<string, typeof Home> = { Home, Flame, Car, Scissors, Wrench, BrickWall, Laptop, Sparkles };
export const CatIcon = ({ name, className }: { name: string; className?: string }) => {
  const I = CAT_ICONS[name] ?? Sparkles;
  return <I className={className} />;
};

export function PortfolioThumb({ image, hue, title, className }: { image?: string; hue: number; title: string; className?: string }) {
  if (image) return <img src={image} alt={title} className={cx('object-cover', className)} loading="lazy" />;
  return (
    <div className={cx('grid place-items-center', className)} style={{ background: `linear-gradient(140deg, hsl(${hue} 35% 88%), hsl(${(hue + 30) % 360} 35% 78%))` }} role="img" aria-label={`${title} (sem foto)`}>
      <ImageIcon className="size-7 text-black/25" />
    </div>
  );
}

/** Três tipos de confiança, nunca misturados. */
export function TrustRow({ identity, confirmedJobs, references, compact }: { identity: boolean; confirmedJobs: number; references: number; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {identity && (
        <Badge tone="green">
          <BadgeCheck className="size-3.5" /> Identidade verificada
        </Badge>
      )}
      {confirmedJobs > 0 && (
        <Badge tone="blue">
          <Handshake className="size-3.5" /> {confirmedJobs} {compact ? 'contratações' : `contratação${confirmedJobs > 1 ? 'ões' : ''} confirmada${confirmedJobs > 1 ? 's' : ''}`}
        </Badge>
      )}
      {references > 0 && (
        <Badge tone="violet">
          <Users className="size-3.5" /> {references} indicaç{references > 1 ? 'ões' : 'ão'} do bairro
        </Badge>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">{icon ?? <Sparkles />}</div>
      <p className="font-bold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div className={cx('flex gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-snug', tone === 'info' ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-900')}>
      {tone === 'info' ? <ShieldCheck className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal aria-label={title} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 safe-b sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 hover:bg-stone-100">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TopBar({ title, back, right }: { title: string; back?: string | true; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/95 px-3 backdrop-blur">
      {back && (
        <button aria-label="Voltar" onClick={() => (back === true ? history.back() : go(back))} className="rounded-full p-2 hover:bg-brand-50">
          <ChevronLeft className="size-5" />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h1>
      {right}
    </header>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-6', className)}>
      <div className="mb-3 flex items-end justify-between gap-2 px-4">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition', active ? 'border-brand-800 bg-brand-800 text-white' : 'border-line bg-white text-ink hover:border-brand-200')}
    >
      {children}
    </button>
  );
}

export const Spinner = () => (
  <div className="grid min-h-[50vh] place-items-center text-brand-700">
    <Loader2 className="size-8 animate-spin" aria-label="Carregando" />
  </div>
);
