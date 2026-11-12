import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, Loader2 } from 'lucide-react';

interface AudioUploaderProps {
  onAudioUploaded: (base64Audio: string, mimeType: string, filename: string) => Promise<void>;
  isLoading: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onAudioUploaded,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i)) {
      alert('Por favor selecione um arquivo de áudio válido (.mp3, .m4a, .wav, .ogg, .webm)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const mime = file.type || 'audio/webm';
      await onAudioUploaded(result, mime, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
          : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/40'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center justify-center gap-2">
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        ) : (
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
            {isDragging ? <FileAudio className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
          </div>
        )}
        <div className="text-sm font-semibold text-zinc-200">
          {isLoading ? 'Transcrevendo e refinando áudio com IA...' : 'Importar Áudio ou Mensagem de Voz'}
        </div>
        <p className="text-xs text-zinc-500 max-w-sm">
          Arraste notas de voz do WhatsApp, gravações de reunião (.mp3, .m4a, .wav) para transformar em texto limpo
        </p>
      </div>
    </div>
  );
};
