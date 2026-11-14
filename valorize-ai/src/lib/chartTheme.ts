/**
 * Paleta única dos gráficos: tons claros e suaves, com contraste suficiente sobre fundo branco.
 * Mude aqui para alterar as cores de TODOS os gráficos do app.
 */
export const CHART = {
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
  /** Sequência para séries categóricas (alocação por ativo etc.) */
  series: ['#3f8f78', '#5b7fa6', '#c9973a', '#8f7bb8', '#c46a5e', '#4fa3b5', '#9aa65a', '#b07a9a', '#7f8c99', '#d08a5a'],
} as const;

export const axisTick = { fontSize: 11, fill: CHART.axis };

export const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  boxShadow: '0 4px 14px rgb(15 23 42 / 0.08)',
  fontSize: 12,
  color: '#334155',
};
