import React, { useRef, useState } from 'react';
import {
  Settings, X, Volume2, Globe, Sliders, Copy, KeyRound, Eye, EyeOff, CheckCircle2,
  Loader2, ExternalLink, Cpu, Wand2, Download, Upload, Trash2, AlertTriangle, Vibrate,
} from 'lucide-react';
import { ToneSettings } from '../types';
import { MODEL_OPTIONS, testApiKey } from '../lib/gemini';
import { openExternal } from '../lib/native';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ToneSettings;
  onUpdateSettings: (s: Partial<ToneSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onClearHistory: () => void;
  historyCount: number;
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto-detectar (multilíngue)' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'ja-JP', name: '日本語 (Japonês)' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
];

const Section: React.FC<{ icon: any; title: string; children: React.ReactNode; right?: React.ReactNode }> = ({
  icon: Icon, title, children, right,
}) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-purple-400" />
        {title}
      </span>
      {right}
    </div>
    {children}
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, settings, onUpdateSettings, onExportBackup, onImportBackup, onClearHistory, historyCount,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const runTest = async () => {
    setTestState('testing');
    setTestMsg('');
    try {
      const model = await testApiKey(settings.apiKey.trim(), settings.model);
      setTestState('ok');
      setTestMsg(`Conectado! Modelo ativo: ${model}`);
    } catch (e: any) {
      setTestState('error');
      setTestMsg(e.message);
    }
  };

  const input = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-base">Preferências</h3>
              <p className="text-xs text-zinc-400">IA, tom, idioma e backup</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          {/* API KEY */}
          <Section
            icon={KeyRound}
            title="Chave da IA (Gemini)"
            right={
              settings.apiKey ? (
                <span className="text-emerald-400 text-[11px] font-semibold">Configurada</span>
              ) : (
                <span className="text-amber-400 text-[11px] font-semibold">Obrigatória</span>
              )
            }
          >
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => {
                  onUpdateSettings({ apiKey: e.target.value.trim() });
                  setTestState('idle');
                }}
                placeholder="Cole aqui: AIza..."
                autoComplete="off"
                spellCheck={false}
                className={`${input} pr-11 font-mono text-xs`}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={runTest}
                disabled={!settings.apiKey || testState === 'testing'}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {testState === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Testar conexão
              </button>
              <button
                onClick={() => openExternal('https://aistudio.google.com/apikey')}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Pegar chave grátis
              </button>
            </div>
            {testMsg && (
              <p className={`text-[11px] ${testState === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{testMsg}</p>
            )}
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              A chave fica salva apenas neste aparelho e é usada direto com o Google — também pelo teclado Dicta.
            </p>
          </Section>

          <Section icon={Cpu} title="Modelo de IA">
            <select value={settings.model} onChange={(e) => onUpdateSettings({ model: e.target.value })} className={input}>
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </Section>

          <Section icon={Globe} title="Idioma da fala">
            <select value={settings.language} onChange={(e) => onUpdateSettings({ language: e.target.value })} className={input}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </Section>

          <Section
            icon={Sliders}
            title="Formalidade"
            right={<span className="text-purple-400 font-medium">{settings.formality <= 2 ? 'Casual' : settings.formality >= 4 ? 'Executivo' : 'Equilibrado'}</span>}
          >
            <input type="range" min="1" max="5" value={settings.formality}
              onChange={(e) => onUpdateSettings({ formality: +e.target.value })}
              className="w-full accent-purple-500" />
          </Section>

          <Section
            icon={Sliders}
            title="Concisão"
            right={<span className="text-purple-400 font-medium">{settings.brevity <= 2 ? 'Detalhado' : settings.brevity >= 4 ? 'Ultra-direto' : 'Médio'}</span>}
          >
            <input type="range" min="1" max="5" value={settings.brevity}
              onChange={(e) => onUpdateSettings({ brevity: +e.target.value })}
              className="w-full accent-purple-500" />
          </Section>

          <Section icon={Wand2} title="Instrução fixa (opcional)">
            <textarea
              value={settings.customInstruction}
              onChange={(e) => onUpdateSettings({ customInstruction: e.target.value })}
              rows={2}
              placeholder='Ex.: "Assine os e-mails como Charles – PCP Komatsu" ou "use termos de chão de fábrica"'
              className={`${input} text-xs resize-none`}
            />
          </Section>

          <div className="pt-2 border-t border-zinc-800/80 space-y-3">
            {[
              { k: 'autoCopy' as const, icon: Copy, t: 'Copiar automaticamente', d: 'Copia o texto pronto assim que a IA terminar' },
              { k: 'soundEffects' as const, icon: Volume2, t: 'Sons', d: 'Bipes ao iniciar e encerrar a fala' },
              { k: 'hapticFeedback' as const, icon: Vibrate, t: 'Vibração', d: 'Vibra ao gravar e nas teclas do teclado Dicta' },
            ].map(({ k, icon: Icon, t, d }) => (
              <label key={k} className="flex items-center justify-between gap-3 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{t}</div>
                    <div className="text-[11px] text-zinc-500">{d}</div>
                  </div>
                </div>
                <input type="checkbox" checked={settings[k]} onChange={(e) => onUpdateSettings({ [k]: e.target.checked })}
                  className="w-5 h-5 accent-purple-600" />
              </label>
            ))}
          </div>

          <Section icon={Download} title="Backup local">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onExportBackup}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Importar
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportBackup(f); e.target.value = ''; }} />
            </div>
            <button
              onClick={() => { if (confirmClear) { onClearHistory(); setConfirmClear(false); } else setConfirmClear(true); }}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                confirmClear ? 'bg-rose-600 text-white border-rose-500' : 'bg-transparent text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
              }`}
            >
              {confirmClear ? <AlertTriangle className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              {confirmClear ? 'Toque de novo para confirmar' : `Apagar histórico (${historyCount})`}
            </button>
          </Section>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold">
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
};
