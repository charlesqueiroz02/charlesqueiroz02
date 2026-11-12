/**
 * Dicta AI 2.0 — Teclado e estúdio de ditado por voz com IA
 * Versão "local-first": roda 100% no aparelho + Gemini direto (sem servidor).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Sparkles, BookOpen, History, Settings, Smartphone, Layers, MessageSquare, Mail,
  ListOrdered, FileCheck, Flame, Zap, HelpCircle, Play, RotateCcw, AlertCircle, X, KeyRound,
  Users, Clock, Type,
} from 'lucide-react';
import { DictationMode, DictationNote, DictionaryItem, ToneSettings, isDictationMode } from './types';
import { MAX_HISTORY, parseBackup, sanitizeDictionary, sanitizeNotes, sanitizeSettings } from './utils/backup';
import { VoiceRecordingManager, MicError, toGeminiAudio } from './utils/speech';
import { setFeedbackPrefs, soundEffects } from './utils/audio';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { DiffViewer } from './components/DiffViewer';
import { VoiceCommandBar } from './components/VoiceCommandBar';
import { KeyboardSimulator } from './components/KeyboardSimulator';
import { KeyboardSetupCard } from './components/KeyboardSetupCard';
import { DictionaryModal } from './components/DictionaryModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { AudioUploader } from './components/AudioUploader';
import { MicPermissionModal } from './components/MicPermissionModal';
import { copyToClipboard } from './utils/clipboard';
import { AIContext, transcribeAudio, refineText, applyVoiceCommand, applyVoiceCommandAudio } from './lib/gemini';
import { blobToBase64, isNativeApp, saveOrShareFile, syncNativeConfig } from './lib/native';

const MODES = [
  { id: 'casual', label: 'WhatsApp / Chat', icon: MessageSquare, color: 'from-emerald-500 to-teal-600' },
  { id: 'email', label: 'E-mail', icon: Mail, color: 'from-blue-500 to-indigo-600' },
  { id: 'bullet', label: 'Tópicos', icon: ListOrdered, color: 'from-purple-500 to-pink-600' },
  { id: 'meeting', label: 'Ata de Reunião', icon: Users, color: 'from-sky-500 to-cyan-600' },
  { id: 'verbatim', label: 'Literal Limpo', icon: FileCheck, color: 'from-amber-500 to-orange-600' },
  { id: 'social', label: 'LinkedIn', icon: Flame, color: 'from-violet-500 to-purple-600' },
  { id: 'summary', label: 'Resumo', icon: Zap, color: 'from-cyan-500 to-blue-600' },
] as const;

const SAMPLE_MESSY_SPEECHES = [
  {
    label: 'Reunião e Prazos',
    raw: 'Então, tipo assim, cara... a gente precisa entregar o relatório financeiro até amanhã às duas horas, não, peraí, acho melhor às três e meia da tarde, né? Porque o cliente tá cobrando, humm... e não pode esquecer de incluir os gráficos do Q3.',
  },
  {
    label: 'Alinhamento com Cliente',
    raw: 'Oi fulano, então ééé... falando sobre aquela proposta que você mandou, tipo, eu achei muito boa mas precisamos, sei lá, ajustar o valor do escopo em 10%, sabe? Vamos fechar até sexta-feira se você concordar com os termos.',
  },
  {
    label: 'Chão de Fábrica',
    raw: 'Pessoal, ééé, a lança da PC200 tá atrasada de novo porque faltou, tipo, a chapa do reforço, né? Aí a gente vai ter que, humm, reprogramar pra quinta, não, pra sexta de manhã, e avisar a montagem.',
  },
];

const DEFAULT_SETTINGS: ToneSettings = {
  formality: 3,
  brevity: 3,
  language: 'pt-BR',
  autoCopy: false,
  hapticFeedback: true,
  soundEffects: true,
  apiKey: '',
  model: 'auto',
  customInstruction: '',
};

const MAX_RECORDING_SECONDS = 300;

/** setItem pode lançar (cota cheia, modo privado): nunca deixe isso quebrar a tela */
function saveLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('Falha ao salvar', key, e);
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'keyboard'>(() =>
    new URLSearchParams(location.search).get('tab') === 'keyboard' ? 'keyboard' : 'studio'
  );
  const [selectedMode, setSelectedMode] = useState<DictationMode>(() => {
    const saved = localStorage.getItem('dicta_mode');
    return isDictationMode(saved) ? saved : 'casual';
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [liveInterimText, setLiveInterimText] = useState('');
  const [rawCapturedText, setRawCapturedText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [fillerWordsRemoved, setFillerWordsRemoved] = useState<string[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState('Português (pt-BR)');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMicHelpOpen, setIsMicHelpOpen] = useState(false);

  const [settings, setSettings] = useState<ToneSettings>(() => {
    // Dados salvos passam pela mesma validação do backup: localStorage corrompido não derruba o app
    const stored = loadJSON<Record<string, unknown>>('dicta_settings', {});
    return {
      ...DEFAULT_SETTINGS,
      ...sanitizeSettings(stored),
      apiKey: typeof stored?.apiKey === 'string' ? stored.apiKey.trim() : '',
    };
  });
  const [dictionary, setDictionary] = useState<DictionaryItem[]>(() =>
    sanitizeDictionary(
      loadJSON<unknown>('dicta_dictionary', [
        { id: '1', term: 'Komatsu' },
        { id: '2', term: 'PCP' },
        { id: '3', term: 'WhatsApp' },
      ])
    )
  );
  const [notesHistory, setNotesHistory] = useState<DictationNote[]>(() => sanitizeNotes(loadJSON<unknown>('dicta_history', [])));

  const recorderRef = useRef<VoiceRecordingManager | null>(null);
  const timerRef = useRef<any>(null);
  const durationRef = useRef(0);
  const lastAudioRef = useRef<{ base64: string; mime: string } | null>(null);
  const lastTextRef = useRef<string>('');
  // Sempre aponta para a versão mais recente de handleStopRecording (o setInterval guardaria uma cópia antiga)
  const stopRecordingRef = useRef<() => void>(() => {});

  // ---------- Persistência local + sincronização com o teclado nativo ----------
  useEffect(() => saveLocal('dicta_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => saveLocal('dicta_dictionary', JSON.stringify(dictionary)), [dictionary]);
  useEffect(() => saveLocal('dicta_history', JSON.stringify(notesHistory.slice(0, MAX_HISTORY))), [notesHistory]);
  useEffect(() => saveLocal('dicta_mode', selectedMode), [selectedMode]);

  useEffect(() => {
    syncNativeConfig({
      apiKey: settings.apiKey,
      model: settings.model,
      language: settings.language,
      formality: settings.formality,
      brevity: settings.brevity,
      customInstruction: settings.customInstruction,
      mode: selectedMode,
      dictionary: dictionary.map((d) => d.term),
      sounds: settings.soundEffects,
      haptics: settings.hapticFeedback,
    });
  }, [settings, dictionary, selectedMode]);

  useEffect(() => {
    setFeedbackPrefs({ sounds: settings.soundEffects, haptics: settings.hapticFeedback });
  }, [settings.soundEffects, settings.hapticFeedback]);

  // Primeira abertura sem chave → abre Preferências
  useEffect(() => {
    if (!settings.apiKey && !sessionStorage.getItem('dicta_key_prompted')) {
      sessionStorage.setItem('dicta_key_prompted', '1');
      setTimeout(() => setIsSettingsOpen(true), 600);
    }
    if (new URLSearchParams(location.search).get('action') === 'dictate') {
      setTimeout(() => handleStartRecording(), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const aiCtx = (mode: DictationMode = selectedMode): AIContext => ({
    apiKey: settings.apiKey,
    model: settings.model,
    mode,
    formality: settings.formality,
    brevity: settings.brevity,
    language: settings.language,
    dictionary: dictionary.map((d) => d.term),
    customInstruction: settings.customInstruction,
  });

  const fail = (err: any, retry: boolean) => {
    setErrorMessage(err?.message || 'Algo deu errado.');
    setCanRetry(retry);
  };

  // ---------- Botão voltar do Android ----------
  useEffect(() => {
    window.__dictaOnBack = () => {
      if (isSettingsOpen) return setIsSettingsOpen(false), true;
      if (isHistoryOpen) return setIsHistoryOpen(false), true;
      if (isDictionaryOpen) return setIsDictionaryOpen(false), true;
      if (isMicHelpOpen) return setIsMicHelpOpen(false), true;
      if (isRecording) return cancelRecording(), true;
      if (activeTab !== 'studio') return setActiveTab('studio'), true;
      return false;
    };
  });

  // ---------- Gravação ----------
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const handleStartRecording = async () => {
    if (isProcessingAI) return;
    setErrorMessage(null);
    setMicDenied(false);
    setLiveInterimText('');
    setRecordingDuration(0);
    durationRef.current = 0;

    const manager = new VoiceRecordingManager();
    manager.setLanguage(settings.language);
    manager.onTranscriptChange = (final, interim) => setLiveInterimText((final + ' ' + interim).trim());
    manager.onVolumeChange = setVolume;

    try {
      await manager.start();
    } catch (err) {
      if (err instanceof MicError && err.code === 'denied') {
        setMicDenied(true);
        if (isNativeApp()) window.DictaNative!.requestMicPermission();
      }
      fail(err, false);
      return;
    }
    soundEffects.playStartSound();
    recorderRef.current = manager;
    setIsRecording(true);
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setRecordingDuration(durationRef.current);
      if (durationRef.current >= MAX_RECORDING_SECONDS) stopRecordingRef.current();
    }, 1000);
  };

  const cancelRecording = () => {
    stopTimer();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setIsRecording(false);
    setVolume(0);
    setLiveInterimText('');
  };

  const handleStopRecording = async () => {
    const manager = recorderRef.current;
    if (!manager) return;
    recorderRef.current = null;
    stopTimer();
    soundEffects.playStopSound();
    setIsRecording(false);
    setVolume(0);

    const blob = await manager.stop();
    const live = manager.getLiveText() || liveInterimText.trim();

    if (blob && blob.size > 1500 && durationRef.current >= 1) {
      setIsProcessingAI(true);
      try {
        const { blob: audio, mime } = await toGeminiAudio(blob);
        const base64 = await blobToBase64(audio);
        lastAudioRef.current = { base64, mime };
        await runTranscription(base64, mime, live);
      } finally {
        setIsProcessingAI(false);
      }
    } else if (live) {
      await processTextRefine(live);
    } else {
      fail(new Error('Gravação muito curta. Segure um pouco mais e fale perto do microfone.'), false);
    }
  };

  stopRecordingRef.current = handleStopRecording;

  const handleToggleRecording = () => (isRecording ? handleStopRecording() : handleStartRecording());

  // ---------- IA ----------
  /** Devolve true se o texto final foi gerado (direto ou pelo fallback da prévia ao vivo) */
  const runTranscription = async (base64: string, mime: string, fallbackText = ''): Promise<boolean> => {
    setErrorMessage(null);
    try {
      const data = await transcribeAudio(base64, mime, aiCtx());
      if (typeof data.refinedText !== 'string' || !data.refinedText.trim()) {
        fail(new Error('Não entendi nenhuma fala nesse áudio. Tente de novo em um lugar mais silencioso.'), false);
        return false;
      }
      handleProcessingSuccess(
        data.rawTranscript || fallbackText,
        data.refinedText,
        data.fillerWordsRemoved || [],
        data.detectedLanguage || 'auto'
      );
      return true;
    } catch (err: any) {
      if (fallbackText && !err?.fatal) return processTextRefine(fallbackText);
      fail(err, !err?.fatal);
      return false;
    }
  };

  const processTextRefine = async (text: string, mode: DictationMode = selectedMode): Promise<boolean> => {
    setIsProcessingAI(true);
    setErrorMessage(null);
    lastTextRef.current = text;
    lastAudioRef.current = null;
    try {
      const data = await refineText(text, aiCtx(mode));
      handleProcessingSuccess(text, data.refinedText?.trim() ? data.refinedText : text, data.fillerWordsRemoved || [], data.detectedLanguage || 'auto', mode);
      return true;
    } catch (err: any) {
      fail(err, !err?.fatal);
      return false;
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleRetry = async () => {
    setErrorMessage(null);
    if (lastAudioRef.current) {
      setIsProcessingAI(true);
      try {
        await runTranscription(lastAudioRef.current.base64, lastAudioRef.current.mime);
      } finally {
        setIsProcessingAI(false);
      }
    } else if (lastTextRef.current) {
      await processTextRefine(lastTextRef.current);
    }
  };

  const handleProcessingSuccess = (raw: string, refined: string, fillers: string[], lang: string, mode: DictationMode = selectedMode) => {
    setRawCapturedText(raw);
    setRefinedText(refined);
    setFillerWordsRemoved(fillers);
    setDetectedLanguage(lang);
    setCanRetry(false);
    soundEffects.playSuccessSound();
    if (settings.autoCopy) copyToClipboard(refined).then(() => showToast('Texto copiado ✓'));

    const note: DictationNote = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rawText: raw,
      refinedText: refined,
      mode,
      detectedLanguage: lang,
      fillerWordsRemoved: fillers,
      durationSeconds: durationRef.current,
      wordCount: refined.trim().split(/\s+/).length,
    };
    setNotesHistory((prev) => [note, ...prev]);
  };

  const handleApplyVoiceCommand = async (command: string) => {
    if (!refinedText.trim()) return;
    setIsProcessingAI(true);
    try {
      const updated = await applyVoiceCommand(refinedText, command, aiCtx());
      if (typeof updated !== 'string' || !updated.trim()) {
        fail(new Error('A IA não devolveu um texto editado. Seu texto foi mantido — tente reformular o comando.'), false);
      } else {
        setRefinedText(updated);
        soundEffects.playSuccessSound();
      }
    } catch (err: any) {
      fail(err, false);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleApplyAudioCommand = async (blob: Blob) => {
    if (!refinedText.trim()) return;
    setIsProcessingAI(true);
    try {
      const { blob: audio, mime } = await toGeminiAudio(blob);
      const res = await applyVoiceCommandAudio(refinedText, await blobToBase64(audio), mime, aiCtx());
      if (typeof res.updatedText !== 'string' || !res.updatedText.trim()) {
        fail(new Error('Não entendi o comando falado. Seu texto foi mantido — tente de novo ou digite o comando.'), false);
        return;
      }
      setRefinedText(res.updatedText);
      if (res.command) showToast(`✓ ${res.command}`);
      soundEffects.playSuccessSound();
    } catch (err: any) {
      fail(err, false);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSwitchMode = async (newMode: DictationMode) => {
    // Evita duas reescritas ao mesmo tempo (a resposta mais lenta sobrescreveria a outra)
    if (isProcessingAI) return;
    setSelectedMode(newMode);
    const source = rawCapturedText || refinedText;
    if (!source || isRecording) return;
    setIsProcessingAI(true);
    try {
      const data = await refineText(source, aiCtx(newMode));
      if (data.refinedText?.trim()) setRefinedText(data.refinedText);
    } catch (err: any) {
      fail(err, false);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleAudioUploaded = async (dataUrl: string, mimeType: string, filename: string) => {
    setIsProcessingAI(true);
    durationRef.current = 0;
    try {
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      const mime = mimeType.split(';')[0] || 'audio/mpeg';
      lastAudioRef.current = { base64, mime };
      if (await runTranscription(base64, mime, '')) showToast(`Arquivo "${filename}" processado`);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleTestSample = (sampleText: string) => {
    setLiveInterimText(sampleText);
    durationRef.current = 0;
    processTextRefine(sampleText);
  };

  // ---------- Dicionário / histórico / backup ----------
  const handleAddDictionaryItem = (term: string, category?: string) =>
    setDictionary((prev) => [...prev, { id: Date.now().toString(), term, category, createdAt: Date.now() }]);
  const handleRemoveDictionaryItem = (id: string) => setDictionary((prev) => prev.filter((i) => i.id !== id));

  const handleExportBackup = () => {
    const { apiKey, ...safeSettings } = settings;
    void apiKey;
    const data = { app: 'dicta-ai', version: 2, exportedAt: new Date().toISOString(), settings: safeSettings, dictionary, history: notesHistory };
    saveOrShareFile(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `dicta-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      if (data.dictionary) setDictionary(data.dictionary);
      if (data.history) {
        const incoming = data.history;
        setNotesHistory((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          return [...prev, ...incoming.filter((n) => !ids.has(n.id))]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, MAX_HISTORY);
        });
      }
      setSettings((prev) => ({ ...prev, ...data.settings, apiKey: prev.apiKey }));
      showToast('Backup importado ✓');
    } catch {
      showToast('Arquivo de backup inválido');
    }
  };

  const totalWords = notesHistory.reduce((s, n) => s + (n.wordCount || 0), 0);
  const minutesSaved = Math.max(0, Math.round(totalWords / 38 - totalWords / 140));

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const onUpdateSettings = useCallback((v: Partial<ToneSettings>) => setSettings((p) => ({ ...p, ...v })), []);

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col selection:bg-purple-500/30 selection:text-white">
      <header className="sticky top-0 z-40 bg-[#090A0F]/90 backdrop-blur-xl border-b border-zinc-800/80 px-3 sm:px-8 py-2.5">
        <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 ring-1 ring-white/20 shrink-0">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="font-extrabold text-base tracking-tight text-white">Dicta</h1>
              <span className="text-[10px] uppercase tracking-wider text-purple-300/80 font-semibold">AI Keyboard</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setIsDictionaryOpen(true)} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-purple-400" title="Dicionário">
              <BookOpen className="w-4 h-4" />
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-purple-400" title="Histórico">
              <History className="w-4 h-4" />
              {notesHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-purple-600 text-[9px] font-bold text-white flex items-center justify-center">
                  {notesHistory.length > 99 ? '99+' : notesHistory.length}
                </span>
              )}
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300" title="Preferências">
              <Settings className="w-4 h-4" />
              {!settings.apiKey && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#090A0F]" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 pb-28">
        {!settings.apiKey && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-left"
          >
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-200">Configure a IA em 1 minuto</div>
              <div className="text-xs text-amber-200/70">Cole sua chave gratuita do Google Gemini para ativar o ditado.</div>
            </div>
            <span className="text-xs font-bold text-amber-300">Configurar ›</span>
          </button>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-rose-200 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {canRetry && (
                <button onClick={handleRetry} className="px-3.5 py-2 bg-rose-600 text-white font-semibold rounded-xl flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
                </button>
              )}
              {micDenied && (
                <button
                  onClick={() => (isNativeApp() ? window.DictaNative!.openAppSettings() : setIsMicHelpOpen(true))}
                  className="px-3 py-2 bg-zinc-800 text-zinc-200 font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Liberar microfone
                </button>
              )}
              {/chave/i.test(errorMessage) && (
                <button onClick={() => setIsSettingsOpen(true)} className="px-3 py-2 bg-zinc-800 text-zinc-200 font-semibold rounded-xl border border-zinc-700">
                  Abrir Preferências
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 text-sm">
          {[
            { id: 'studio' as const, label: 'Estúdio', icon: Sparkles },
            { id: 'keyboard' as const, label: 'Teclado', icon: Smartphone },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === t.id ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow' : 'text-zinc-400'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 flex items-center gap-1.5 px-1">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Estilo do texto
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-3.5 px-3.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              const sel = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSwitchMode(m.id as DictationMode)}
                  disabled={isProcessingAI}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border disabled:opacity-50 ${
                    sel
                      ? `bg-gradient-to-r ${m.color} text-white border-transparent shadow-lg shadow-purple-900/30`
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'studio' && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl flex flex-col items-center text-center">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

              <div className="mb-4 flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-xs relative">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : isProcessingAI ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-zinc-300 font-medium">
                  {isRecording ? `Gravando • ${formatTime(recordingDuration)}` : isProcessingAI ? 'IA refinando o texto…' : 'Pronto para ditar'}
                </span>
              </div>

              <div className="w-full max-w-xl min-h-[48px] mb-4 flex items-center justify-center relative">
                {isRecording ? (
                  <p className="text-sm sm:text-base text-purple-200 font-medium line-clamp-3">
                    {liveInterimText || 'Fale naturalmente… pausas, "né" e "tipo assim" serão removidos.'}
                  </p>
                ) : isProcessingAI ? (
                  <div className="flex items-center gap-2 text-purple-300 text-sm font-medium">
                    <Sparkles className="w-4 h-4 animate-spin" /> Removendo vícios e formatando…
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 max-w-md">Toque no botão, fale como quiser e toque de novo para finalizar.</p>
                )}
              </div>

              <div className="relative my-2">
                {isRecording && <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-60 blur-xl animate-pulse" />}
                <button
                  onClick={handleToggleRecording}
                  disabled={isProcessingAI}
                  className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 shadow-2xl transition-all duration-300 active:scale-95 ${
                    isRecording
                      ? 'bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 text-white ring-8 ring-rose-500/20'
                      : isProcessingAI
                      ? 'bg-zinc-800 text-zinc-500'
                      : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white ring-4 ring-purple-500/30'
                  }`}
                >
                  {isRecording ? <Square className="w-9 h-9 fill-current" /> : isProcessingAI ? <Sparkles className="w-9 h-9 animate-spin" /> : <Mic className="w-10 h-10" />}
                  <span className="text-[11px] font-bold tracking-wider uppercase">{isRecording ? 'Finalizar' : isProcessingAI ? 'Aguarde' : 'Ditar'}</span>
                </button>
              </div>

              {isRecording && (
                <button onClick={cancelRecording} className="mt-3 text-xs text-zinc-400 flex items-center gap-1 relative">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
              )}

              <div className="mt-4 w-full flex justify-center">
                <WaveformVisualizer isRecording={isRecording} volume={volume} />
              </div>

              {!isRecording && !isProcessingAI && (
                <div className="mt-5 pt-5 border-t border-zinc-800/80 w-full max-w-xl relative">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2.5 flex items-center justify-center gap-1.5">
                    <Play className="w-3 h-3 text-purple-400" /> Teste com uma fala bagunçada
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SAMPLE_MESSY_SPEECHES.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleTestSample(s.raw)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" /> {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(refinedText || isProcessingAI) && (
              <div className="space-y-4">
                <DiffViewer
                  rawText={rawCapturedText || liveInterimText}
                  refinedText={refinedText}
                  fillerWordsRemoved={fillerWordsRemoved}
                  detectedLanguage={detectedLanguage}
                  mode={selectedMode}
                  onEditText={setRefinedText}
                />
                <VoiceCommandBar
                  currentText={refinedText}
                  onApplyCommand={handleApplyVoiceCommand}
                  onApplyAudioCommand={handleApplyAudioCommand}
                  isLoading={isProcessingAI}
                />
              </div>
            )}

            {notesHistory.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Type, v: totalWords.toLocaleString('pt-BR'), l: 'palavras ditadas' },
                  { icon: Clock, v: `${minutesSaved} min`, l: 'economizados' },
                  { icon: History, v: notesHistory.length, l: 'ditados' },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                    <s.icon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-white">{s.v}</div>
                    <div className="text-[10px] text-zinc-500">{s.l}</div>
                  </div>
                ))}
              </div>
            )}

            <AudioUploader onAudioUploaded={handleAudioUploaded} onError={(msg) => fail(new Error(msg), false)} isLoading={isProcessingAI} />
          </div>
        )}

        {activeTab === 'keyboard' && (
          <div className="space-y-6">
            <KeyboardSetupCard hasApiKey={!!settings.apiKey} onOpenSettings={() => setIsSettingsOpen(true)} />

            <div className="text-center max-w-md mx-auto space-y-1">
              <h2 className="text-sm font-bold text-zinc-300">Prévia interativa</h2>
              <p className="text-xs text-zinc-500">Experimente aqui como o teclado se comporta.</p>
            </div>

            <KeyboardSimulator
              currentText={refinedText}
              liveText={liveInterimText}
              volume={volume}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
              onRefineMode={handleSwitchMode}
              activeMode={selectedMode}
              isLoading={isProcessingAI}
            />
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-zinc-900 text-center text-[11px] text-zinc-600">
        Dicta AI 2.0 • seus dados ficam no seu aparelho
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm text-white shadow-2xl max-w-[90vw] truncate">
          {toast}
        </div>
      )}

      <DictionaryModal
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        items={dictionary}
        onAddItem={handleAddDictionaryItem}
        onRemoveItem={handleRemoveDictionaryItem}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        notes={notesHistory}
        onSelectNote={(note) => {
          setRefinedText(note.refinedText);
          setRawCapturedText(note.rawText);
          setFillerWordsRemoved(note.fillerWordsRemoved);
          setSelectedMode(note.mode);
          setActiveTab('studio');
          setIsHistoryOpen(false);
        }}
        onDeleteNote={(id) => setNotesHistory((prev) => prev.filter((n) => n.id !== id))}
        onTogglePin={(id) => setNotesHistory((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)))}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onClearHistory={() => setNotesHistory([])}
        historyCount={notesHistory.length}
      />

      <MicPermissionModal
        isOpen={isMicHelpOpen}
        onClose={() => setIsMicHelpOpen(false)}
        onTryDemo={() => {
          setErrorMessage(null);
          setIsMicHelpOpen(false);
          handleTestSample(SAMPLE_MESSY_SPEECHES[0].raw);
        }}
      />
    </div>
  );
}
