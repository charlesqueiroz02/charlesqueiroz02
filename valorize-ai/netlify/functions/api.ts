// Netlify Function: a mesma API do server.ts (cotações, Radar, comparador e IA)
// rodando no Netlify. As rotas /api/* chegam aqui pelo netlify.toml.
import serverless from 'serverless-http';
import { apiApp } from '../../server/api';

export const handler = serverless(apiApp);
