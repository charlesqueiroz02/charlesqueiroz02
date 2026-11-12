import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTO_MODELS, MAX_ATTEMPTS, getModeGuideline, isModelUnavailable, modelQueue, parseJson, refineText, testApiKey } from './gemini';

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
    const q = modelQueue('gemini-3.8-flash');
    expect(q[0]).toBe('gemini-3.8-flash');
    expect(q.filter((m) => m === 'gemini-3.8-flash')).toHaveLength(1);
  });

  it('prioriza o último modelo que funcionou', () => {
    localStorage.setItem('dicta_last_good_model', 'gemini-3.8-flash');
    expect(modelQueue()[0]).toBe('gemini-3.8-flash');
  });

  it('nunca usa modelos 2.x aposentados, nem salvos nem como "último que funcionou"', () => {
    localStorage.setItem('dicta_last_good_model', 'gemini-2.5-flash');
    expect(modelQueue('gemini-2.5-flash').some((m) => m.startsWith('gemini-2'))).toBe(false);
    expect(modelQueue('auto')).toEqual(AUTO_MODELS);
  });

  it('Flash-Lite vem primeiro na fila automática (mais barato)', () => {
    expect(AUTO_MODELS[0]).toMatch(/flash-lite/);
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

describe('modelo indisponível (bug do print: "no longer available to new users")', () => {
  beforeEach(installLocalStorage);
  afterEach(() => {
    delete (globalThis as any).localStorage;
    vi.unstubAllGlobals();
  });

  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  const gone = { error: { code: 400, message: 'This model models/gemini-x is no longer available to new users. Please update your code to use a newer model.' } };
  const ok = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
  const ctx = { apiKey: 'k', mode: 'casual' as const, formality: 3, brevity: 3, language: 'pt-BR', dictionary: [] };

  it('reconhece as respostas de modelo indisponível', () => {
    expect(isModelUnavailable(400, gone.error.message)).toBe(true);
    expect(isModelUnavailable(404, 'qualquer')).toBe(true);
    expect(isModelUnavailable(400, 'API key not valid. Please pass a valid API key.')).toBe(false);
    expect(isModelUnavailable(429, 'no longer available')).toBe(false);
  });

  it('pula o modelo indisponível sem gastar tentativa e lembra dele', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply(400, gone))
      .mockImplementationOnce(() => reply(400, gone))
      .mockImplementationOnce(() => reply(503, {}))
      .mockImplementationOnce(() => reply(200, ok('{"refinedText":"Tudo certo."}')));
    vi.stubGlobal('fetch', fetchMock);
    const r = await refineText('tudo certo', ctx);
    expect(r.refinedText).toBe('Tudo certo.');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    // na próxima chamada os dois indisponíveis nem são tentados
    const q = modelQueue('auto', 'k');
    expect(q).not.toContain(AUTO_MODELS[0]);
    expect(q).not.toContain(AUTO_MODELS[1]);
    // e o modelo que respondeu vira o primeiro da fila
    expect(q[0]).toBe(AUTO_MODELS[3]);
    // outra chave não herda a lista de indisponíveis
    expect(modelQueue('auto', 'outra-chave')).toContain(AUTO_MODELS[1]);
  });

  it('com limite (429) + modelo indisponível, mostra a mensagem do limite em português', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply(429, { error: { message: 'Resource exhausted' } }))
      .mockImplementation(() => reply(400, gone));
    vi.stubGlobal('fetch', fetchMock);
    await expect(refineText('oi', ctx)).rejects.toThrow(/Limite gratuito do Gemini/);
  });

  it('erro desconhecido da API não aparece em inglês', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(400, { error: { message: 'Request contains an invalid argument.' } })));
    const err = await refineText('oi', ctx).catch((e) => e);
    expect(err.message).toMatch(/A IA recusou o pedido \(código 400\)/);
    expect(err.message).not.toMatch(/invalid argument/i);
  });

  it('429 com espera curta tenta de novo o mesmo modelo', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply(429, { error: { message: 'x', details: [{ retryDelay: '0.01s' }] } }))
      .mockImplementationOnce(() => reply(200, ok('{"refinedText":"Ok."}')));
    vi.stubGlobal('fetch', fetchMock);
    await expect(refineText('ok', ctx)).resolves.toMatchObject({ refinedText: 'Ok.' });
    expect(fetchMock.mock.calls[0][0]).toBe(fetchMock.mock.calls[1][0]);
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
