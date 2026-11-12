/**
 * Gravação de voz real (MediaRecorder) + prévia ao vivo quando o navegador suporta.
 * Sem "modo simulação": se o microfone falhar, o erro é mostrado ao usuário.
 */

export class MicError extends Error {
  code: 'denied' | 'unavailable' | 'busy';
  constructor(code: MicError['code'], msg: string) {
    super(msg);
    this.code = code;
  }
}

/**
 * Decide se um novo volume deve ser repassado à interface: no máximo a cada
 * `minIntervalMs` e só quando muda mais que `minDelta` (ou volta a zero).
 */
export function createVolumeThrottle(minIntervalMs = 66, minDelta = 0.03) {
  let lastT = -Infinity;
  let lastV = -1;
  return (v: number, now: number): boolean => {
    if (now - lastT < minIntervalMs) return false;
    if (Math.abs(v - lastV) < minDelta && !(v === 0 && lastV !== 0)) return false;
    lastT = now;
    lastV = v;
    return true;
  };
}

export class VoiceRecordingManager {
  private recognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private raf: number | null = null;
  private finalText = '';

  public onTranscriptChange?: (finalText: string, interimText: string) => void;
  public onVolumeChange?: (volume: number) => void;

  constructor() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';
        this.recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < event.results.length; i++) {
            const r = event.results[i];
            if (r.isFinal) final += r[0].transcript + ' ';
            else interim += r[0].transcript;
          }
          this.finalText = final.trim();
          this.onTranscriptChange?.(final.trim(), interim.trim());
        };
        this.recognition.onerror = () => {};
      } catch {
        this.recognition = null;
      }
    }
  }

  get hasLivePreview() {
    return !!this.recognition;
  }

  setLanguage(lang: string) {
    if (this.recognition) this.recognition.lang = lang === 'auto' ? navigator.language || 'pt-BR' : lang;
  }

  async start(): Promise<void> {
    this.chunks = [];
    this.finalText = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicError('unavailable', 'Este aparelho não oferece acesso ao microfone.');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new MicError('denied', 'Permissão de microfone negada. Libere o microfone para o Dicta.');
      }
      if (name === 'NotReadableError') {
        throw new MicError('busy', 'O microfone está em uso por outro app. Feche-o e tente de novo.');
      }
      throw new MicError('unavailable', 'Não foi possível acessar o microfone.');
    }

    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new Ctx();
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      src.connect(this.analyser);
      this.volumeLoop();
    } catch {}

    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mimeType = types.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t));
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.mediaRecorder.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);
    this.mediaRecorder.start(250);

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {}
    }
  }

  private volumeLoop() {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const throttle = createVolumeThrottle();
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const vol = Math.min(1, sum / data.length / 110);
      // Cada aviso vira um setState no App: limitamos para não re-renderizar a tela a 60 fps
      if (throttle(vol, performance.now())) this.onVolumeChange?.(vol);
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  getLiveText() {
    return this.finalText;
  }

  /** Cancela sem devolver áudio */
  cancel() {
    try {
      this.recognition?.abort?.();
    } catch {}
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  async stop(): Promise<Blob | null> {
    try {
      this.recognition?.stop();
    } catch {}
    return new Promise((resolve) => {
      const rec = this.mediaRecorder;
      if (rec && rec.state !== 'inactive') {
        rec.onstop = () => {
          const type = (rec.mimeType || 'audio/webm').split(';')[0];
          const blob = new Blob(this.chunks, { type });
          this.cleanup();
          resolve(blob);
        };
        rec.stop();
      } else {
        this.cleanup();
        resolve(null);
      }
    });
  }

  private cleanup() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.onVolumeChange?.(0);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.audioCtx && this.audioCtx.state !== 'closed') this.audioCtx.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
  }
}

/**
 * Converte qualquer áudio gravado para WAV 16 kHz mono — formato aceito
 * oficialmente pelo Gemini e bem menor que o WAV original.
 * Se a conversão falhar, devolve o blob original.
 */
export async function toGeminiAudio(blob: Blob): Promise<{ blob: Blob; mime: string }> {
  const original = { blob, mime: (blob.type || 'audio/webm').split(';')[0] };
  try {
    const buf = await blob.arrayBuffer();
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    ctx.close().catch(() => {});
    const targetRate = 16000;
    const OffCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const length = Math.ceil(decoded.duration * targetRate);
    if (!length) return original;
    const off = new OffCtx(1, length, targetRate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return { blob: encodeWav(rendered.getChannelData(0), targetRate), mime: 'audio/wav' };
  } catch {
    return original;
  }
}

export function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
