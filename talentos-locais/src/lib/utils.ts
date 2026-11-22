export const uid = (p = '') =>
  p + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 18));

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (t: number | string) =>
  new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtDateTime = (t: number | string) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `há ${Math.floor(s / 86400)} d`;
  return fmtDate(t);
};

/** Remove acentos e baixa a caixa — base da busca. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const slugify = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'perfil';

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export const DAY = 86400000;

/** Mascara e-mail para funções administrativas sem acesso a dados pessoais. */
export const maskEmail = (e: string) => {
  const [u, d] = e.split('@');
  return `${u!.slice(0, 2)}***@${d ?? ''}`;
};

/** Reduz uma imagem enviada pelo usuário para caber no armazenamento local. */
export async function compressImage(file: File, max = 900, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 12 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Não foi possível ler a imagem.'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality); // re-encode também descarta metadados (EXIF/GPS)
  } finally {
    URL.revokeObjectURL(url);
  }
}
