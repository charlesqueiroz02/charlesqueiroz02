import type { CSSProperties } from 'react';
import { isDarkTheme } from './theme';

/**
 * Paleta única dos gráficos, com versões para o tema claro e o escuro.
 * Mude aqui para alterar as cores de TODOS os gráficos do app.
 *
 * Os gráficos (Recharts/SVG) não leem variáveis CSS nos atributos de cor, por isso cada
 * cor é um "getter": devolve o tom do tema ativo no momento em que o gráfico é desenhado.
 * Ao trocar o tema, o App remonta as telas e os gráficos pegam as cores novas.
 */
const LIGHT = {
  graham: '#5b7fa6',   // azul-ardósia
  bazin: '#3f8f78',    // verde-sálvia
  price: '#475569',    // grafite
  positive: '#3f8f78',
  negative: '#c46a5e', // coral suave
  amber: '#c9973a',
  neutral: '#94a3b8',
  grid: '#e9edf1',
  axis: '#64748b',
  buyZone: '#dcefe7',
  track: '#eef1f4',    // trilho do medidor da Nota
  surface: '#ffffff',  // fundo dos cartões (contorno de pontos e fatias)
  series: ['#3f8f78', '#5b7fa6', '#c9973a', '#8f7bb8', '#c46a5e', '#4fa3b5', '#9aa65a', '#b07a9a', '#7f8c99', '#d08a5a'],
};

const DARK: typeof LIGHT = {
  graham: '#8fb0d6',
  bazin: '#6fbf9f',
  price: '#c6ced7',
  positive: '#6fbf9f',
  negative: '#e08e82',
  amber: '#e2b65f',
  neutral: '#6b7683',
  grid: '#2a323a',
  axis: '#9aa5b1',
  buyZone: '#1d3a30',
  track: '#2a323a',
  surface: '#1a2026',
  series: ['#6fbf9f', '#8fb0d6', '#e2b65f', '#b6a2dc', '#e08e82', '#7cc5d4', '#bcc77e', '#d4a3c0', '#a3afbb', '#eeaa7c'],
};

const pick = () => (isDarkTheme() ? DARK : LIGHT);

/**
 * Objetos comuns com "getters" (e não Proxy): o Recharts congela os objetos que recebe
 * (Object.freeze), e um Proxy quebrava o gráfico. Getters funcionam mesmo congelados.
 */
function liveObject<T extends object>(keys: (keyof T)[], read: (k: keyof T) => unknown): T {
  const o = {} as T;
  keys.forEach(k => Object.defineProperty(o, k, { get: () => read(k), enumerable: true }));
  return o;
}

export const CHART = liveObject<typeof LIGHT>(Object.keys(LIGHT) as (keyof typeof LIGHT)[], k => pick()[k]);

export const axisTick = liveObject<{ fontSize: number; fill: string }>(['fontSize', 'fill'], k => (k === 'fontSize' ? 11 : pick().axis));

export const tooltipStyle = liveObject<CSSProperties>(
  ['backgroundColor', 'border', 'borderRadius', 'boxShadow', 'fontSize', 'color'],
  k => tooltipValues()[k as keyof ReturnType<typeof tooltipValues>],
);

function tooltipValues() {
  const dark = isDarkTheme();
  return {
    backgroundColor: dark ? '#1f262d' : '#ffffff',
    border: `1px solid ${dark ? '#39424c' : '#e2e8f0'}`,
    borderRadius: 10,
    boxShadow: dark ? '0 4px 14px rgb(0 0 0 / 0.4)' : '0 4px 14px rgb(15 23 42 / 0.08)',
    fontSize: 12,
    color: dark ? '#e3e8ed' : '#334155',
  };
}
