/**
 * Feedback sonoro e tátil.
 * As preferências do usuário (Preferências › Sons / Vibração) são aplicadas aqui,
 * em um só lugar, para que nenhum componente toque som ou vibre sem permissão.
 */

const prefs = { sounds: true, haptics: true };

/** Chamado pelo App sempre que as preferências mudam */
export function setFeedbackPrefs(p: { sounds: boolean; haptics: boolean }) {
  prefs.sounds = p.sounds;
  prefs.haptics = p.haptics;
}

function vibrateSafe(p: number | number[]) {
  if (!prefs.haptics) return;
  try {
    if (window.DictaNative) window.DictaNative.vibrate(Array.isArray(p) ? p[0] : p);
    else navigator.vibrate?.(p);
  } catch {}
}

interface Tone {
  freq: number;
  /** frequência final (glissando); omitida = nota fixa */
  toFreq?: number;
  /** atraso em segundos a partir de agora */
  at?: number;
  peak: number;
  dur: number;
}

/** Gera sons curtos com Web Audio (sem arquivos de áudio) */
class SoundEffects {
  private ctx: AudioContext | null = null;

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private play(tones: Tone[], vibration: number | number[]) {
    vibrateSafe(vibration);
    if (!prefs.sounds) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const t of tones) {
        const start = now + (t.at ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, start);
        if (t.toFreq) osc.frequency.exponentialRampToValueAtTime(t.toFreq, start + t.dur * 0.7);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(t.peak, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + t.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + t.dur + 0.02);
      }
    } catch (e) {
      console.warn('Falha no efeito sonoro', e);
    }
  }

  playStartSound() {
    this.play([{ freq: 440, toFreq: 880, peak: 0.15, dur: 0.18 }], 20);
  }

  playStopSound() {
    this.play([{ freq: 740, toFreq: 370, peak: 0.12, dur: 0.18 }], [25, 30, 25]);
  }

  playSuccessSound() {
    // Acorde Dó-Mi-Sol
    this.play(
      [523.25, 659.25, 783.99].map((freq, i) => ({ freq, at: i * 0.06, peak: 0.1, dur: 0.14 })),
      15
    );
  }
}

export const soundEffects = new SoundEffects();

/**
 * Leitura em voz alta: TTS nativo do Android dentro do APK, Web Speech no navegador.
 */
export function speakText(text: string, lang = 'pt-BR') {
  if (!text) return;
  if (window.DictaNative) {
    window.DictaNative.speak(text, lang === 'auto' ? 'pt-BR' : lang);
    return;
  }
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (window.DictaNative) window.DictaNative.stopSpeaking();
  else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
