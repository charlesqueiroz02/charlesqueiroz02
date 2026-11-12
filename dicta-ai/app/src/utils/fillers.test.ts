import { describe, expect, it } from 'vitest';
import { splitFillers } from './fillers';

const fillersOf = (text: string, f: string[]) => splitFillers(text, f).filter((p) => p.isFiller).map((p) => p.text);

describe('splitFillers', () => {
  it('destaca vícios com acento (o \\b ASCII falhava)', () => {
    expect(fillersOf('Tá bom, né? Então ééé vamos', ['né', 'ééé'])).toEqual(['né', 'ééé']);
  });

  it('não marca pedaços de outras palavras', () => {
    expect(fillersOf('A tipografia ficou boa', ['tipo'])).toEqual([]);
    expect(fillersOf('Ele né-gocia bem? né', ['né'])).toEqual(['né', 'né']);
  });

  it('prefere a expressão mais longa e ignora maiúsculas', () => {
    expect(fillersOf('Tipo assim, foi bom', ['tipo', 'tipo assim'])).toEqual(['Tipo assim']);
  });

  it('aceita vícios com pontuação sem quebrar a regex', () => {
    expect(fillersOf('então... vamos (sabe?)', ['então...', 'sabe?'])).toEqual(['então...', 'sabe?']);
  });

  it('reconstrói o texto original sem perdas', () => {
    const t = 'humm, a gente, tipo, entrega amanhã né';
    expect(splitFillers(t, ['humm', 'tipo', 'né']).map((p) => p.text).join('')).toBe(t);
    expect(splitFillers(t, [])).toEqual([{ text: t, isFiller: false }]);
  });
});
