import { describe, expect, it } from 'vitest';
import { countWords, timeSavedSeconds } from './stats';

describe('stats', () => {
  it('conta palavras ignorando espaços extras', () => {
    expect(countWords('  olá   mundo \n novo ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });

  it('estima o tempo economizado', () => {
    expect(timeSavedSeconds(0)).toBe(0);
    expect(timeSavedSeconds(140)).toBe(Math.round((140 / 38) * 60) - 60);
  });
});
