import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, validateAudioFile } from './AudioUploader';

describe('validateAudioFile', () => {
  it('aceita áudio pelo tipo ou pela extensão', () => {
    expect(validateAudioFile({ name: 'x.bin', type: 'audio/mpeg', size: 10 })).toBeNull();
    expect(validateAudioFile({ name: 'nota.OPUS', type: '', size: 10 })).toBeNull();
  });

  it('rejeita outros formatos, vazio e arquivos grandes demais', () => {
    expect(validateAudioFile({ name: 'foto.jpg', type: 'image/jpeg', size: 10 })).toMatch(/áudio/);
    expect(validateAudioFile({ name: 'a.mp3', type: 'audio/mpeg', size: 0 })).toMatch(/vazio/);
    expect(validateAudioFile({ name: 'a.mp3', type: 'audio/mpeg', size: MAX_UPLOAD_BYTES + 1 })).toMatch(/grande demais/);
  });
});
