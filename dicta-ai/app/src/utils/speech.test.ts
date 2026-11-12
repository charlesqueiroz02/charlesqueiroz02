import { describe, expect, it } from 'vitest';
import { encodeWav } from './speech';

describe('encodeWav', () => {
  it('gera cabeçalho WAV PCM 16 bits mono válido', async () => {
    const samples = new Float32Array([0, 1, -1, 0.5]);
    const blob = encodeWav(samples, 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2);

    const v = new DataView(await blob.arrayBuffer());
    const str = (o: number, n: number) => String.fromCharCode(...Array.from({ length: n }, (_, i) => v.getUint8(o + i)));
    expect(str(0, 4)).toBe('RIFF');
    expect(str(8, 4)).toBe('WAVE');
    expect(str(36, 4)).toBe('data');
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(16000); // taxa
    expect(v.getUint16(34, true)).toBe(16); // bits
    expect(v.getInt16(46, true)).toBe(0x7fff); // 1.0 → máximo positivo
    expect(v.getInt16(48, true)).toBe(-0x8000); // -1.0 → mínimo
  });

  it('limita amostras fora do intervalo [-1, 1]', async () => {
    const v = new DataView(await encodeWav(new Float32Array([3, -3]), 8000).arrayBuffer());
    expect(v.getInt16(44, true)).toBe(0x7fff);
    expect(v.getInt16(46, true)).toBe(-0x8000);
  });
});
