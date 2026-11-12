import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTO_MODELS, MAX_ATTEMPTS, getModeGuideline, modelQueue, parseJson, testApiKey } from './gemini';

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

describe('callGemini (via testApiKey)', () => {
  beforeEach(installLocalStorage);
  afterEach(() => {
    delete (globalThis as any).localStorage;
    vi.unstubAllGlobals();
  });

  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

  it(`tenta no máximo ${MAX_ATTEMPTS} modelos quando o servidor falha`, async () => {
    const fetchMock = vi.fn(() => reply(503, { error: { message: 'overloaded' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(testApiKey('k')).rejects.toThrow(/ocupados/);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it('para na hora com chave inválida (erro fatal)', async () => {
    const fetchMock = vi.fn(() => reply(400, { error: { message: 'API key not valid' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(testApiKey('k')).rejects.toMatchObject({ fatal: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pula modelo inexistente (404) e memoriza o que funcionou', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply(404, { error: { message: 'not found' } }))
      .mockImplementationOnce(() => reply(200, { candidates: [{ content: { parts: [{ text: 'OK' }] } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const model = await testApiKey('k');
    expect(model).toBe(AUTO_MODELS[1]);
    expect(localStorage.getItem('dicta_last_good_model')).toBe(AUTO_MODELS[1]);
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
