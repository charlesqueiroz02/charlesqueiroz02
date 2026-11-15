import { describe, it, expect } from 'vitest';
import { cleanApiKey, classifyAiError, redactSecrets } from '../aiStatus';

describe('chave da IA', () => {
  it('limpa espaços, quebras de linha, aspas e o nome da variável colados junto', () => {
    expect(cleanApiKey('  AIzaSyABC123 \n')).toBe('AIzaSyABC123');
    expect(cleanApiKey('"AIzaSyABC123"')).toBe('AIzaSyABC123');
    expect(cleanApiKey('GEMINI_API_KEY=AIzaSyABC123')).toBe('AIzaSyABC123');
    expect(cleanApiKey(undefined)).toBe('');
  });
  it('nunca mostra a chave em mensagens de erro', () => {
    expect(redactSecrets('erro com AIzaSyD-abcdefghijklmnop123 aqui')).toBe('erro com [chave] aqui');
    expect(redactSecrets('{"error":{"code":400,"message":"API key not valid. Please pass a valid API key."}}')).toBe('API key not valid. Please pass a valid API key.');
  });
});

describe('causa do erro da IA', () => {
  it('reconhece as causas mais comuns do Gemini', () => {
    expect(classifyAiError('API key not valid. Please pass a valid API key.', 400)).toBe('chave_invalida');
    expect(classifyAiError('models/gemini-3.8-flash is not found for API version v1beta', 404)).toBe('modelo');
    expect(classifyAiError('Resource has been exhausted (e.g. check quota).', 429)).toBe('limite');
    expect(classifyAiError('Timeout waiting for model response')).toBe('tempo');
    expect(classifyAiError('fetch failed')).toBe('outro');
  });
});
