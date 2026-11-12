import { describe, expect, it } from 'vitest';
import { MAX_HISTORY, parseBackup, sanitizeDictionary, sanitizeNotes, sanitizeSettings } from './backup';

describe('sanitizeNotes', () => {
  it('descarta itens sem refinedText ou que não são objetos', () => {
    const out = sanitizeNotes([null, 1, 'x', {}, { refinedText: 42 }, { refinedText: 'ok', id: 'a' }]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });

  it('preenche campos ausentes com valores seguros', () => {
    const [n] = sanitizeNotes([{ refinedText: 'olá mundo', mode: 'inexistente', fillerWordsRemoved: ['né', 3] }]);
    expect(n.rawText).toBe('');
    expect(n.mode).toBe('casual');
    expect(n.fillerWordsRemoved).toEqual(['né']);
    expect(n.wordCount).toBe(2);
    expect(typeof n.id).toBe('string');
    expect(typeof n.timestamp).toBe('number');
  });

  it('limita o tamanho do histórico', () => {
    const many = Array.from({ length: MAX_HISTORY + 20 }, (_, i) => ({ refinedText: `t${i}` }));
    expect(sanitizeNotes(many)).toHaveLength(MAX_HISTORY);
  });

  it('aceita qualquer coisa que não seja array sem lançar', () => {
    expect(sanitizeNotes({ a: 1 })).toEqual([]);
    expect(sanitizeNotes(null)).toEqual([]);
  });
});

describe('sanitizeDictionary', () => {
  it('remove vazios e duplicados (sem diferenciar maiúsculas)', () => {
    const out = sanitizeDictionary([{ term: 'PCP' }, { term: 'pcp' }, { term: '  ' }, { term: 5 }, { term: 'Komatsu' }]);
    expect(out.map((d) => d.term)).toEqual(['PCP', 'Komatsu']);
  });
});

describe('sanitizeSettings', () => {
  it('ignora chaves desconhecidas, tipos errados e a chave da IA', () => {
    const s = sanitizeSettings({ apiKey: 'AIza-roubada', formality: 'alta', brevity: 9, autoCopy: 'sim', soundEffects: false, foo: 1 });
    expect(s).toEqual({ brevity: 5, soundEffects: false });
  });

  it('valida idioma e modelo', () => {
    expect(sanitizeSettings({ language: 'pt-BR', model: 'gemini-3.8-flash' })).toEqual({ language: 'pt-BR', model: 'gemini-3.8-flash' });
    // modelo aposentado pelo Google volta para Automático
    expect(sanitizeSettings({ model: 'gemini-2.5-flash' })).toEqual({ model: 'auto' });
    expect(sanitizeSettings({ language: '<script>', model: '../x' })).toEqual({});
  });
});

describe('parseBackup', () => {
  it('rejeita arquivos que não são backup do Dicta', () => {
    expect(() => parseBackup('{"app":"outro"}')).toThrow();
    expect(() => parseBackup('não é json')).toThrow();
  });

  it('retorna null para seções ausentes', () => {
    const b = parseBackup('{"app":"dicta-ai"}');
    expect(b).toEqual({ settings: {}, dictionary: null, history: null });
  });
});
