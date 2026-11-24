let ctx: AudioContext | null = null;

/** Ponte com o app Android (MainActivity.java). No navegador ela não existe. */
interface PonteNativa {
  falar(texto: string): void;
  calar(): void;
  telaAcesa(ligar: boolean): void;
}
const nativo = (): PonteNativa | undefined => (window as unknown as { CalisNative?: PonteNativa }).CalisNative;
export const noAppAndroid = () => !!nativo();

export function desbloquearAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* sem áudio */
  }
}

export function bipe(freq = 880, duracao = 0.12, volume = 0.25) {
  try {
    desbloquearAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duracao + 0.02);
  } catch {
    /* ignora */
  }
}

let vozPt: SpeechSynthesisVoice | null | undefined;

function escolherVoz(): SpeechSynthesisVoice | null {
  if (vozPt !== undefined && vozPt !== null) return vozPt;
  const vozes = window.speechSynthesis?.getVoices() ?? [];
  vozPt = vozes.find((v) => v.lang === 'pt-BR') ?? vozes.find((v) => v.lang.startsWith('pt')) ?? null;
  return vozPt;
}

export function falar(texto: string) {
  try {
    const n = nativo();
    if (n) return n.falar(texto);
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    u.rate = 1.05;
    const v = escolherVoz();
    if (v) u.voice = v;
    s.speak(u);
  } catch {
    /* ignora */
  }
}

export function calar() {
  try {
    const n = nativo();
    if (n) return n.calar();
    window.speechSynthesis?.cancel();
  } catch {
    /* ignora */
  }
}

/** Mantém a tela acesa durante o treino, quando o navegador permite. */
export async function manterTelaAcesa(): Promise<() => void> {
  try {
    const n = nativo();
    if (n) {
      n.telaAcesa(true);
      return () => n.telaAcesa(false);
    }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (!nav.wakeLock) return () => {};
    const lock = await nav.wakeLock.request('screen');
    return () => void lock.release().catch(() => {});
  } catch {
    return () => {};
  }
}
