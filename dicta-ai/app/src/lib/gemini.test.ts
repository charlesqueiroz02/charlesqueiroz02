import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AUTO_MODELS, getModeGuideline, modelQueue, parseJson } from './gemini';

// localStorage mínimo para rodar no ambiente Node
function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

describe('parseJson', () => {
  it('lê JSON puro e mescla com o fallback', () => {
    const r = parseJson('{"refinedText":"oi"}', { refinedText: '', fillerWordsRemoved: [] as string[] });
    expect(r).toEqual({ refinedText: 'oi', fillerWordsRemoved: [] });
  });

  it('remove cercas de código ```json', () => {
    const r = parseJson('```json\n{"a":1}\n```', { a: 0 });
    expect(r.a).toBe(1);
  });

  it('devolve o fallback quando o texto não é JSON', () => {
    const fb = { refinedText: 'texto cru' };
    expect(parseJson('isso não é json', fb)).toBe(fb);
  });
});

describe('modelQueue', () => {
  beforeEach(installLocalStorage);
  afterEach(() => delete (globalThis as any).localStorage);

  it('usa a lista automática quando não há preferência', () => {
    expect(modelQueue('auto')).toEqual(AUTO_MODELS);
  });

  it('coloca o modelo escolhido primeiro, sem duplicar', () => {
    const q = modelQueue('gemini-2.5-flash');
    expect(q[0]).toBe('gemini-2.5-flash');
    expect(q.filter((m) => m === 'gemini-2.5-flash')).toHaveLength(1);
  });

  it('prioriza o último modelo que funcionou', () => {
    localStorage.setItem('dicta_last_good_model', 'gemini-2.5-flash-lite');
    expect(modelQueue()[0]).toBe('gemini-2.5-flash-lite');
  });
});

describe('getModeGuideline', () => {
  it('reflete formalidade e concisão', () => {
    expect(getModeGuideline('email', 5, 5)).toMatch(/formal/);
    expect(getModeGuideline('email', 1, 1)).toMatch(/casual/);
    expect(getModeGuideline('email', 3, 5)).toMatch(/ultra-concise/);
  });

  it('modo desconhecido cai no texto genérico', () => {
    expect(getModeGuideline('xyz')).toMatch(/Refine/);
  });
});
