import React, { useState } from 'react';
import { Mic, MicOff, Send, Sparkles, Wand2, Globe2, ListOrdered, Smile, Briefcase, FileText } from 'lucide-react';
import { VoiceRecordingManager } from '../utils/speech';
import { soundEffects } from '../utils/audio';

interface VoiceCommandBarProps {
  currentText: string;
  onApplyCommand: (command: string) => Promise<void>;
  onApplyAudioCommand: (audio: Blob) => Promise<void>;
  isLoading: boolean;
}

const PRESET_COMMANDS = [
  { label: 'Traduzir p/ Inglês', icon: Globe2, command: 'Traduzir todo o texto fielmente para o inglês mantendo o tom natural' },
  { label: 'Mais Formal & Executivo', icon: Briefcase, command: 'Reescrever em tom corporativo, polido e profissional' },
  { label: 'Amigável & Leve', icon: Smile, command: 'Deixar a mensagem mais calorosa, simpática e descontraída' },
  { label: 'Transformar em Tópicos', icon: ListOrdered, command: 'Estruturar em tópicos objetivos com marcadores claros' },
  { label: 'Encurtar em 50%', icon: FileText, command: 'Resumir e cortar pela metade, mantendo apenas o essencial' },
];

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  currentText,
  onApplyCommand,
  onApplyAudioCommand,
  isLoading,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [isRecordingVoiceCommand, setIsRecordingVoiceCommand] = useState(false);
  const [recordingManager, setRecordingManager] = useState<VoiceRecordingManager | null>(null);
  const [micError, setMicError] = useState('');

  const handleStartVoiceCommand = async () => {
    setMicError('');
    const manager = new VoiceRecordingManager();
    manager.onTranscriptChange = (final, interim) => setCommandInput((final + ' ' + interim).trim());
    try {
      await manager.start();
      soundEffects.playStartSound();
      setRecordingManager(manager);
      setIsRecordingVoiceCommand(true);
    } catch (e: any) {
      setMicError(e.message);
    }
  };

  const handleStopVoiceCommand = async () => {
    soundEffects.playStopSound();
    setIsRecordingVoiceCommand(false);
    const blob = recordingManager ? await recordingManager.stop() : null;
    setRecordingManager(null);
    // Se houve prévia ao vivo usamos o texto; senão a IA ouve o comando gravado
    if (commandInput.trim()) handleSubmit(commandInput.trim());
    else if (blob && blob.size > 1500) {
      onApplyAudioCommand(blob);
    }
  };

  const handleSubmit = (cmd: string) => {
    if (!cmd.trim() || isLoading || !currentText.trim()) return;
    onApplyCommand(cmd);
    setCommandInput('');
  };

  return (
    <div className="w-full bg-zinc-900/90 rounded-2xl border border-zinc-800/80 p-4 shadow-lg backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
          <Wand2 className="w-3.5 h-3.5" />
          <span>Speak-to-Edit (Edição por Voz e IA)</span>
        </div>
        <span className="text-[11px] text-zinc-500">
          Diga o que mudar ou use os atalhos
        </span>
      </div>

      {/* Preset pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {PRESET_COMMANDS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSubmit(item.command)}
              disabled={isLoading || !currentText.trim()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 text-zinc-300 hover:text-white border border-zinc-700/50 whitespace-nowrap text-xs transition-all disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-purple-400" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Command input form with voice button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(commandInput);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder={
              isRecordingVoiceCommand
                ? 'Ouvindo... fale o comando e toque em parar'
                : 'Ex: "Adicione uma saudação cordial", "Encurte", "Traduza para espanhol"'
            }
            disabled={isLoading}
            className={`w-full bg-zinc-950 border ${
              isRecordingVoiceCommand
                ? 'border-purple-500 ring-2 ring-purple-500/20 text-purple-200'
                : 'border-zinc-800 text-zinc-200'
            } rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-600`}
          />
        </div>

        {/* Voice Command Mic Button */}
        <button
          type="button"
          onClick={isRecordingVoiceCommand ? handleStopVoiceCommand : handleStartVoiceCommand}
          disabled={isLoading || !currentText.trim()}
          className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
            isRecordingVoiceCommand
              ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white'
          }`}
          title={isRecordingVoiceCommand ? 'Parar gravação de comando' : 'Ditar comando de voz'}
        >
          {isRecordingVoiceCommand ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4 text-purple-400" />
          )}
        </button>

        {/* Submit command button */}
        <button
          type="submit"
          disabled={isLoading || !commandInput.trim() || !currentText.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all shadow-md flex items-center gap-1.5"
        >
          {isLoading ? (
            <Sparkles className="w-4 h-4 animate-spin text-purple-200" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aplicar</span>
            </>
          )}
        </button>
      </form>
      {micError && <p className="text-[11px] text-rose-400">{micError}</p>}
    </div>
  );
};
