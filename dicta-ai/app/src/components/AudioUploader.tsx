import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Loader2 } from 'lucide-react';

interface AudioUploaderProps {
  onAudioUploaded: (base64Audio: string, mimeType: string, filename: string) => Promise<void>;
  onError: (message: string) => void;
  isLoading: boolean;
}

/** O Gemini aceita até ~20 MB por requisição; o base64 aumenta o arquivo em ~33% */
export const MAX_UPLOAD_BYTES = 14 * 1024 * 1024;
const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|opus|webm|aac|flac)$/i;

/** Valida o arquivo e devolve a mensagem de erro (ou null se estiver ok) */
export function validateAudioFile(file: { name: string; type: string; size: number }): string | null {
  if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) {
    return 'Selecione um arquivo de áudio (.mp3, .m4a, .wav, .ogg, .opus, .webm).';
  }
  if (file.size === 0) return 'O arquivo de áudio está vazio.';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Arquivo grande demais (${(file.size / 1048576).toFixed(1)} MB). O limite é ${MAX_UPLOAD_BYTES / 1048576} MB — corte o áudio ou envie um trecho menor.`;
  }
  return null;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onAudioUploaded, onError, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = isLoading || isReading;

  const processFile = (file: File) => {
    if (busy) return;
    const problem = validateAudioFile(file);
    if (problem) {
      onError(problem);
      return;
    }
    setIsReading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      setIsReading(false);
      await onAudioUploaded(reader.result as string, file.type || 'audio/webm', file.name);
    };
    reader.onerror = () => {
      setIsReading(false);
      onError('Não foi possível ler o arquivo de áudio.');
    };
    reader.readAsDataURL(file);
  };

  const openPicker = () => {
    if (!busy) fileInputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      aria-label="Importar arquivo de áudio para transcrever"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) processFile(f);
      }}
      onClick={openPicker}
      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
        busy ? 'cursor-wait opacity-70' : 'cursor-pointer'
      } ${
        isDragging
          ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
          : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/40'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.opus,.webm"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Zera o campo para permitir escolher o mesmo arquivo de novo
          e.target.value = '';
          if (f) processFile(f);
        }}
      />

      <div className="flex flex-col items-center justify-center gap-2">
        {busy ? (
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" aria-hidden="true" />
        ) : (
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
            {isDragging ? <FileAudio className="w-6 h-6" aria-hidden="true" /> : <UploadCloud className="w-6 h-6" aria-hidden="true" />}
          </div>
        )}
        <div className="text-sm font-semibold text-zinc-200">
          {busy ? 'Transcrevendo e refinando áudio com IA...' : 'Importar Áudio ou Mensagem de Voz'}
        </div>
        <p className="text-xs text-zinc-400 max-w-sm">
          Arraste notas de voz do WhatsApp, gravações de reunião (.mp3, .m4a, .wav) para transformar em texto limpo — até{' '}
          {MAX_UPLOAD_BYTES / 1048576} MB
        </p>
      </div>
    </div>
  );
};
