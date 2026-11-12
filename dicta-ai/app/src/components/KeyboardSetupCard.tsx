import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Mic, CheckCircle2, Circle, ChevronRight, KeyRound, Smartphone } from 'lucide-react';
import { getKeyboardStatus, isNativeApp, KeyboardStatus } from '../lib/native';

interface Props {
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export const KeyboardSetupCard: React.FC<Props> = ({ hasApiKey, onOpenSettings }) => {
  const [status, setStatus] = useState<KeyboardStatus | null>(getKeyboardStatus());

  const refresh = useCallback(() => setStatus(getKeyboardStatus()), []);

  useEffect(() => {
    const prev = window.__dictaOnResume;
    window.__dictaOnResume = () => {
      prev?.();
      refresh();
    };
    const t = setInterval(refresh, 1500);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', refresh);
      window.__dictaOnResume = prev;
    };
  }, [refresh]);

  if (!isNativeApp()) {
    return (
      <div className="max-w-xl mx-auto p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex gap-3">
        <Smartphone className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <span>O teclado Dicta real (que funciona dentro do WhatsApp, Gmail etc.) está disponível no app Android (APK).</span>
      </div>
    );
  }

  const n = window.DictaNative!;
  const steps = [
    {
      done: hasApiKey,
      icon: KeyRound,
      title: 'Configurar chave da IA',
      desc: 'Chave gratuita do Gemini usada pelo teclado',
      action: onOpenSettings,
      cta: 'Configurar',
    },
    {
      done: !!status?.mic,
      icon: Mic,
      title: 'Liberar microfone',
      desc: 'Necessário para o teclado ouvir você',
      action: () => n.requestMicPermission(),
      cta: 'Permitir',
    },
    {
      done: !!status?.enabled,
      icon: Keyboard,
      title: 'Ativar o teclado Dicta',
      desc: 'Ligue "Dicta AI" na lista de teclados',
      action: () => n.openKeyboardSettings(),
      cta: 'Ativar',
    },
    {
      done: !!status?.selected,
      icon: CheckCircle2,
      title: 'Escolher Dicta como teclado',
      desc: 'Ou alterne pelo ícone ⌨ na barra quando digitar',
      action: () => n.showKeyboardPicker(),
      cta: 'Escolher',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="max-w-xl mx-auto rounded-3xl bg-gradient-to-b from-purple-950/40 to-zinc-950 border border-purple-500/25 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-400" /> Teclado Dicta no seu celular
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Dite com IA em qualquer app: WhatsApp, Gmail, Teams…</p>
        </div>
        <span className="text-xs font-bold text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-full">{doneCount}/4</span>
      </div>

      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={s.action}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
                s.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800 active:bg-zinc-800'
              }`}
            >
              {s.done ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <Circle className="w-5 h-5 text-zinc-600 shrink-0" />}
              <Icon className={`w-4 h-4 shrink-0 ${s.done ? 'text-emerald-300' : 'text-purple-400'}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${s.done ? 'text-emerald-200' : 'text-zinc-100'}`}>{s.title}</div>
                <div className="text-[11px] text-zinc-500">{s.desc}</div>
              </div>
              {!s.done && (
                <span className="text-xs font-semibold text-purple-300 flex items-center">
                  {s.cta} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {doneCount === 4 && (
        <p className="text-xs text-emerald-300 text-center">
          Tudo pronto! Abra qualquer conversa, toque no microfone roxo do teclado e fale.
        </p>
      )}
    </div>
  );
};
