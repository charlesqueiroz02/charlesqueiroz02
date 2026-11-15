// Função da Vercel: a mesma API do servidor Express (cotações, Radar, comparador e IA).
// O vercel.json manda todas as rotas /api/* para cá; ver a normalização em server/api.ts.
import { apiApp } from '../server/api.js';

export default apiApp;
