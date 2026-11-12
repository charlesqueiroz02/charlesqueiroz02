/**
 * Ponte entre o app web e o app Android nativo (WebView).
 * Quando roda dentro do APK, window.DictaNative é injetado pelo Java.
 * Fora do APK (navegador), cada função usa um fallback web.
 */

interface DictaNativeBridge {
  copy(text: string): void;
  share(text: string): void;
  shareFile(base64: string, filename: string, mime: string): void;
  setConfig(json: string): void;
  speak(text: string, lang: string): void;
  stopSpeaking(): void;
  vibrate(ms: number): void;
  openKeyboardSettings(): void;
  showKeyboardPicker(): void;
  getKeyboardStatus(): string; // JSON {enabled, selected, mic}
  requestMicPermission(): void;
  openUrl(url: string): void;
  openAppSettings(): void;
  getVersion(): string;
}

declare global {
  interface Window {
    DictaNative?: DictaNativeBridge;
    __dictaOnResume?: () => void;
    __dictaOnBack?: () => boolean;
  }
}

export const native: DictaNativeBridge | undefined =
  typeof window !== 'undefined' ? window.DictaNative : undefined;

export const isNativeApp = (): boolean => typeof window !== 'undefined' && !!window.DictaNative;

export interface KeyboardStatus {
  enabled: boolean;
  selected: boolean;
  mic: boolean;
}

export function getKeyboardStatus(): KeyboardStatus | null {
  if (!window.DictaNative) return null;
  try {
    return JSON.parse(window.DictaNative.getKeyboardStatus());
  } catch {
    return null;
  }
}

/** Envia configuração para o teclado nativo (SharedPreferences) */
export function syncNativeConfig(cfg: Record<string, unknown>) {
  try {
    window.DictaNative?.setConfig(JSON.stringify(cfg));
  } catch (e) {
    console.warn('syncNativeConfig', e);
  }
}

export function nativeShareText(text: string): boolean {
  if (window.DictaNative) {
    window.DictaNative.share(text);
    return true;
  }
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
    return true;
  }
  return false;
}

export function openExternal(url: string) {
  if (window.DictaNative) window.DictaNative.openUrl(url);
  else window.open(url, '_blank', 'noopener');
}

/** Salva/compartilha um arquivo. No APK abre a folha de compartilhamento do Android. */
export async function saveOrShareFile(blob: Blob, filename: string) {
  const mime = (blob.type || 'application/octet-stream').split(';')[0];
  if (window.DictaNative) {
    const base64 = await blobToBase64(blob);
    window.DictaNative.shareFile(base64, filename, mime);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Falha ao ler arquivo'));
    r.readAsDataURL(blob);
  });
}
