import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  Copy,
  Check,
  MessageSquare,
  Mail,
  Hash,
  FileEdit,
  Smartphone,
  Volume2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { DictationMode } from '../types';
import { soundEffects, speakText } from '../utils/audio';
import { WaveformVisualizer } from './WaveformVisualizer';
import { copyToClipboard } from '../utils/clipboard';
import { openExternal } from '../lib/native';
import { modeShortLabel } from '../lib/modes';

interface KeyboardSimulatorProps {
  currentText: string;
  liveText?: string;
  volume?: number;
  isRecording: boolean;
  onToggleRecording: () => void;
  onRefineMode: (mode: DictationMode) => void;
  activeMode: DictationMode;
  isLoading: boolean;
}

type SimulatedApp = 'whatsapp' | 'gmail' | 'slack' | 'notes';

const SIM_APPS: { id: SimulatedApp; label: string; icon: typeof Mail; mode: DictationMode; activeClass: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, mode: 'casual', activeClass: 'bg-emerald-600' },
  { id: 'gmail', label: 'Gmail', icon: Mail, mode: 'email', activeClass: 'bg-rose-600' },
  { id: 'slack', label: 'Slack', icon: Hash, mode: 'casual', activeClass: 'bg-amber-600' },
  { id: 'notes', label: 'Notas', icon: FileEdit, mode: 'bullet', activeClass: 'bg-indigo-600' },
];

const QUICK_MODES: DictationMode[] = ['casual', 'email', 'bullet'];

export const KeyboardSimulator: React.FC<KeyboardSimulatorProps> = ({
  currentText,
  liveText = '',
  volume = 0,
  isRecording,
  onToggleRecording,
  onRefineMode,
  activeMode,
  isLoading,
}) => {
  const [activeApp, setActiveApp] = useState<SimulatedApp>('whatsapp');
  const [copied, setCopied] = useState(false);
  const [simulatedInput, setSimulatedInput] = useState('');
  const [appHistory, setAppHistory] = useState<Record<SimulatedApp, string[]>>({
    whatsapp: [
      'Oi! Você conseguiu ver o relatório da reunião?',
    ],
    gmail: [
      'Prezada Diretoria, seguem os alinhamentos operacionais do trimestre.',
    ],
    slack: [
      'Fala time, sprint planning amanhã às 10h no canal geral.',
    ],
    notes: [
      '• Ideias para o novo lançamento de produto\n• Revisão do roadmap Q3',
    ],
  });

  // Automatically insert polished text when AI completes dictation
  useEffect(() => {
    if (currentText) {
      setSimulatedInput(currentText);
    }
  }, [currentText]);

  // The text currently displayed in the input field: live speech when recording, or typed/refined text
  const displayInputValue = isRecording
    ? (liveText || 'Ouvindo sua fala com Dicta...')
    : simulatedInput;

  const handleSendToApp = () => {
    const textToSend = simulatedInput || currentText;
    if (!textToSend.trim()) return;

    soundEffects.playSuccessSound();
    setAppHistory((prev) => ({
      ...prev,
      [activeApp]: [...prev[activeApp], textToSend],
    }));
    setSimulatedInput('');
  };

  const handleCopy = async () => {
    const text = simulatedInput || currentText;
    if (!text) return;
    await copyToClipboard(text);
    soundEffects.playSuccessSound();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenRealWhatsApp = () => {
    const text = simulatedInput || currentText;
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    openExternal(url);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
      {/* Mobile Frame Header */}
      <div className="bg-zinc-900/90 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-zinc-200">
            Simulador de Teclado Dicta Mobile
          </span>
        </div>

        {/* Simulated App Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs" role="group" aria-label="App simulado">
          {SIM_APPS.map(({ id, label, icon: Icon, mode, activeClass }) => (
            <button
              key={id}
              onClick={() => {
                setActiveApp(id);
                onRefineMode(mode);
              }}
              aria-pressed={activeApp === id}
              aria-label={`Simular ${label}`}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                activeApp === id ? `${activeClass} text-white font-medium` : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={`Simular ${label}`}
            >
              <Icon className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Simulated App Screen Canvas */}
      <div className="p-4 bg-zinc-950 min-h-[220px] max-h-[280px] overflow-y-auto space-y-3 flex flex-col justify-end">
        {/* App identity banner */}
        <div className="text-center pb-2">
          <span className="text-[11px] uppercase tracking-widest text-zinc-500">
            {activeApp === 'whatsapp' && 'Conversa WhatsApp com Cliente'}
            {activeApp === 'gmail' && 'Novo E-mail Corporativo'}
            {activeApp === 'slack' && '#canal-projetos (Slack)'}
            {activeApp === 'notes' && 'Bloco de Notas Rápido'}
          </span>
        </div>

        {/* Existing messages/notes */}
        {appHistory[activeApp].map((msg, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
              index % 2 === 0
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 self-start'
                : activeApp === 'whatsapp'
                ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-100 self-end ml-auto'
                : 'bg-indigo-950/50 border border-indigo-800/40 text-indigo-100 self-end ml-auto'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg}</p>
          </div>
        ))}

        {/* Live typing preview indicator */}
        {isRecording && (
          <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-2xl text-xs text-purple-200 self-end ml-auto max-w-[90%] animate-pulse">
            <div className="flex items-center gap-1.5 text-[10px] text-purple-400 mb-1 font-semibold">
              <Mic className="w-3 h-3 animate-ping" />
              Digitando por voz em tempo real...
            </div>
            <p className="whitespace-pre-wrap font-mono">
              {liveText || 'Fale no microfone...'}
              <span className="inline-block w-1.5 h-3 bg-purple-400 ml-1 animate-pulse" />
            </p>
          </div>
        )}
      </div>

      {/* Simulated App Bottom Input Bar */}
      <div className="p-3 bg-zinc-900/80 border-t border-zinc-800/80 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={displayInputValue}
            onChange={(e) => setSimulatedInput(e.target.value)}
            aria-label="Campo de mensagem simulado"
            placeholder={
              isRecording
                ? 'Ouvindo sua voz...'
                : 'Fale no microfone do Dicta abaixo...'
            }
            className={`w-full bg-zinc-950 border ${
              isRecording
                ? 'border-purple-500 ring-2 ring-purple-500/30 text-purple-200'
                : 'border-zinc-800 text-zinc-200'
            } rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500`}
          />
        </div>

        <button
          onClick={handleSendToApp}
          disabled={!simulatedInput && !currentText}
          className="p-2 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-30 text-white rounded-xl transition-all"
          title="Enviar na conversa simulada" aria-label="Enviar na conversa simulada"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        {activeApp === 'whatsapp' && (simulatedInput || currentText) && (
          <button
            onClick={handleOpenRealWhatsApp}
            className="p-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-xl transition-all"
            title="Abrir mensagem no seu WhatsApp Real" aria-label="Abrir mensagem no seu WhatsApp Real"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* THE DICTA AI KEYBOARD DOCK (Virtual Keyboard Interface) */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 border-t border-purple-900/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-3">
        {/* Dicta Action Strip */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-rose-500 animate-ping' : isLoading ? 'bg-purple-400 animate-pulse' : 'bg-purple-500'
              }`}
            />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
              Dicta Bar
            </span>
            {isRecording && (
              <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-medium">
                Gravando voz...
              </span>
            )}
            {isLoading && (
              <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 animate-spin" />
                Refinando...
              </span>
            )}
          </div>

          {/* Quick Tone Selectors */}
          <div className="flex items-center gap-1" role="group" aria-label="Tom rápido">
            {QUICK_MODES.map((m) => (
              <button
                key={m}
                onClick={() => onRefineMode(m)}
                disabled={isLoading}
                aria-pressed={activeMode === m}
                className={`px-2 py-0.5 rounded-md text-[11px] transition-all disabled:opacity-50 ${
                  activeMode === m ? 'bg-purple-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {modeShortLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Live Audio Waves inside Keyboard Dock */}
        {isRecording && (
          <div className="flex justify-center py-0.5">
            <WaveformVisualizer isRecording={isRecording} volume={volume} barCount={20} />
          </div>
        )}

        {/* Center Mic Button & Real-time Keyboard Interface */}
        <div className="flex items-center justify-center gap-3 py-1">
          <button
            onClick={handleCopy}
            disabled={!simulatedInput && !currentText}
            className="p-3 bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-40 rounded-2xl text-zinc-300 transition-all border border-zinc-700/50"
            title="Copiar texto refinado" aria-label="Copiar texto refinado"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Big Voice Button */}
          <button
            onClick={onToggleRecording}
            disabled={isLoading}
            className={`flex-1 max-w-[280px] py-3.5 px-4 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer ${
              isRecording
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-900/50 animate-pulse ring-4 ring-rose-500/20'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40 hover:scale-[1.02]'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 animate-bounce" />
                <span>Ouvindo... Toque para finalizar</span>
              </>
            ) : isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-purple-200" />
                <span>Polindo com IA...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-purple-200" />
                <span>Toque para Falar com Dicta</span>
              </>
            )}
          </button>

          <button
            onClick={() => speakText(simulatedInput || currentText)}
            disabled={!simulatedInput && !currentText}
            className="p-3 bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-40 rounded-2xl text-zinc-300 transition-all border border-zinc-700/50"
            title="Ouvir em voz alta" aria-label="Ouvir em voz alta"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1">
          <Info className="w-3 h-3 text-purple-400 shrink-0" />
          <span>Fale pelo microfone acima para digitar e polir automaticamente no campo de mensagem</span>
        </div>
      </div>
    </div>
  );
};
