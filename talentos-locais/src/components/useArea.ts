import { useState } from 'react';
import { updateMe } from '../data/actions';
import { DEMO_CITY } from '../data/catalog';
import { useStore } from '../data/store';

const KEY = 'talentoslocais:area';

/** Localidade escolhida manualmente (bairro/cidade). Nunca pedimos GPS. */
export function useArea() {
  const { me } = useStore();
  const [local, setLocal] = useState<{ city: string; neighborhood: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '') as { city: string; neighborhood: string };
    } catch {
      return { city: DEMO_CITY, neighborhood: '' };
    }
  });
  const area = me ? { city: me.city, neighborhood: me.neighborhood } : local;
  const set = (a: { city: string; neighborhood: string }) => {
    if (me) updateMe(a);
    else {
      setLocal(a);
      try {
        localStorage.setItem(KEY, JSON.stringify(a));
      } catch {
        /* ignora */
      }
    }
  };
  return { ...area, set };
}
