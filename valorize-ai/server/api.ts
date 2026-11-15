import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { grahamFairPrice, bazinCeilingPrice, upsidePct, valorizeScore, round, DEFAULT_MIN_YIELD } from '../src/lib/valuation';
import { summarizeDividends, lastFullYears, type DividendYearPoint } from '../src/lib/dividends';
import { normalizeTicker, isValidTicker } from '../src/lib/ticker';
import { rateLimit, securityHeaders, finiteNumber, cleanText } from './security';

// Ensure IPv4 first to prevent IPv6 stalling on external API connections
dns.setDefaultResultOrder('ipv4first');

dotenv.config();


// Roda em dois lugares: no servidor Express (AI Studio/Cloud Run) e como Netlify Function.
export const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
// Funções do Netlify têm ~10 s de limite: usamos tempos menores lá.
const T = IS_SERVERLESS ? { fund: 4000, yahoo: 5000, ai: 8000 } : { fund: 6000, yahoo: 8000, ai: 25000 };

export const apiApp = express();
const app = apiApp;
// No Netlify a chamada pode chegar como /.netlify/functions/api/...; normalizamos para /api/...
app.use((req, _res, next) => {
  if (!IS_SERVERLESS) return next(); // no Express local nada muda
  req.url = req.url.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
  if (!req.url.startsWith('/api')) req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  next();
});

app.use(express.json({ limit: '16kb' }));
app.use('/api', securityHeaders);
// Limites por IP: cotações (cada uma dispara consultas externas) e IA (consome a cota do Gemini)
app.use('/api/stock', rateLimit({ windowMs: 60_000, max: 120, message: 'Muitas consultas em pouco tempo. Aguarde um minuto e tente de novo.' }));
app.use('/api/ai', rateLimit({ windowMs: 10 * 60_000, max: 12, message: 'Limite de análises por IA atingido. Tente novamente em alguns minutos.' }));

// Initialize Gemini on server-side
const apiKey = process.env.GEMINI_API_KEY || '';
// Modelo configurável via .env (GEMINI_MODEL). Troque sem mexer no código.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Últimos 5 anos COMPLETOS: calculado a cada consulta (o servidor pode ficar no ar na virada do ano)
const fiveYears = () => lastFullYears(new Date());
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Cache for stock data to avoid repeated scrapers (valid for 15 minutes)
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;
const CACHE_MAX = 400; // limite de itens para a memória não crescer sem fim

export interface ReferenceStock {
  ticker: string;
  name: string;
  sector: string;
  avgSectorPL: number;
  avgSectorPVP: number;
  avgSectorDY: number;
  refLpa: number;
  refVpa: number;
  refDivs: number;
  refAvgDivs5y: number;
  refDivHistory5y: DividendYearPoint[];
}

const KNOWN_B3_STOCKS: Record<string, ReferenceStock> = {
  "BBAS3": {
    ticker: "BBAS3",
    name: "Banco do Brasil S.A.",
    sector: "Financeiro / Bancos",
    avgSectorPL: 7.5,
    avgSectorPVP: 0.9,
    avgSectorDY: 7.8,
    refLpa: 2.53,
    refVpa: 31.64,
    refDivs: 0.65,
    refAvgDivs5y: 1.62,
    refDivHistory5y: [
      { year: 2021, amount: 0.28, dy: 3.5 },
      { year: 2022, amount: 2.09, dy: 11.2 },
      { year: 2023, amount: 1.89, dy: 8.8 },
      { year: 2024, amount: 2.19, dy: 9.1 },
      { year: 2025, amount: 1.65, dy: 7.6 }
    ]
  },
  "PETR4": {
    ticker: "PETR4",
    name: "Petróleo Brasileiro S.A. Petrobras (PN)",
    sector: "Petróleo, Gás e Biocombustíveis",
    avgSectorPL: 4.8,
    avgSectorPVP: 1.2,
    avgSectorDY: 11.5,
    refLpa: 10.35,
    refVpa: 37.32,
    refDivs: 3.66,
    refAvgDivs5y: 7.39,
    refDivHistory5y: [
      { year: 2021, amount: 3.25, dy: 11.4 },
      { year: 2022, amount: 15.17, dy: 45.2 },
      { year: 2023, amount: 7.34, dy: 21.0 },
      { year: 2024, amount: 7.93, dy: 19.5 },
      { year: 2025, amount: 3.28, dy: 8.2 }
    ]
  },
  "PETR3": {
    ticker: "PETR3",
    name: "Petróleo Brasileiro S.A. Petrobras (ON)",
    sector: "Petróleo, Gás e Biocombustíveis",
    avgSectorPL: 4.8,
    avgSectorPVP: 1.2,
    avgSectorDY: 11.5,
    refLpa: 10.35,
    refVpa: 37.32,
    refDivs: 3.66,
    refAvgDivs5y: 7.39,
    refDivHistory5y: [
      { year: 2021, amount: 3.25, dy: 11.0 },
      { year: 2022, amount: 15.17, dy: 42.0 },
      { year: 2023, amount: 7.34, dy: 19.8 },
      { year: 2024, amount: 7.93, dy: 18.5 },
      { year: 2025, amount: 3.28, dy: 7.8 }
    ]
  },
  "VALE3": {
    ticker: "VALE3",
    name: "Vale S.A.",
    sector: "Mineração e Siderurgia",
    avgSectorPL: 7.2,
    avgSectorPVP: 1.4,
    avgSectorDY: 8.5,
    refLpa: 2.34,
    refVpa: 44.30,
    refDivs: 5.61,
    refAvgDivs5y: 6.66,
    refDivHistory5y: [
      { year: 2021, amount: 6.80, dy: 8.9 },
      { year: 2022, amount: 7.58, dy: 10.2 },
      { year: 2023, amount: 6.08, dy: 8.4 },
      { year: 2024, amount: 5.35, dy: 8.1 },
      { year: 2025, amount: 7.51, dy: 10.6 }
    ]
  },
  "ITUB4": {
    ticker: "ITUB4",
    name: "Itaú Unibanco Holding S.A.",
    sector: "Financeiro / Bancos",
    avgSectorPL: 8.2,
    avgSectorPVP: 1.5,
    avgSectorDY: 6.8,
    refLpa: 3.85,
    refVpa: 21.40,
    refDivs: 2.80,
    refAvgDivs5y: 2.30,
    refDivHistory5y: [
      { year: 2021, amount: 1.25, dy: 5.4 },
      { year: 2022, amount: 1.80, dy: 6.5 },
      { year: 2023, amount: 2.45, dy: 7.8 },
      { year: 2024, amount: 3.20, dy: 9.1 },
      { year: 2025, amount: 2.80, dy: 7.5 }
    ]
  },
  "BBDC4": {
    ticker: "BBDC4",
    name: "Banco Bradesco S.A.",
    sector: "Financeiro / Bancos",
    avgSectorPL: 8.0,
    avgSectorPVP: 0.95,
    avgSectorDY: 6.5,
    refLpa: 1.82,
    refVpa: 17.50,
    refDivs: 1.15,
    refAvgDivs5y: 1.18,
    refDivHistory5y: [
      { year: 2021, amount: 1.12, dy: 6.1 },
      { year: 2022, amount: 1.25, dy: 7.5 },
      { year: 2023, amount: 1.10, dy: 6.8 },
      { year: 2024, amount: 1.28, dy: 8.2 },
      { year: 2025, amount: 1.15, dy: 7.2 }
    ]
  },
  "SANB11": {
    ticker: "SANB11",
    name: "Banco Santander Brasil S.A.",
    sector: "Financeiro / Bancos",
    avgSectorPL: 8.5,
    avgSectorPVP: 1.0,
    avgSectorDY: 7.2,
    refLpa: 2.80,
    refVpa: 29.80,
    refDivs: 2.10,
    refAvgDivs5y: 2.05,
    refDivHistory5y: [
      { year: 2021, amount: 1.95, dy: 6.2 },
      { year: 2022, amount: 2.20, dy: 7.4 },
      { year: 2023, amount: 1.85, dy: 6.5 },
      { year: 2024, amount: 2.15, dy: 7.6 },
      { year: 2025, amount: 2.10, dy: 7.3 }
    ]
  },
  "TAEE11": {
    ticker: "TAEE11",
    name: "Taesa - Transmissora Aliança de Energia Elétrica S.A.",
    sector: "Energia Elétrica",
    avgSectorPL: 9.8,
    avgSectorPVP: 1.6,
    avgSectorDY: 8.5,
    refLpa: 3.40,
    refVpa: 22.10,
    refDivs: 3.01,
    refAvgDivs5y: 3.21,
    refDivHistory5y: [
      { year: 2021, amount: 1.52, dy: 4.8 },
      { year: 2022, amount: 4.85, dy: 12.8 },
      { year: 2023, amount: 2.91, dy: 8.2 },
      { year: 2024, amount: 3.53, dy: 9.8 },
      { year: 2025, amount: 3.23, dy: 8.9 }
    ]
  },
  "TRPL4": {
    ticker: "TRPL4",
    name: "CTEEP - Cia Transmissão Energia Paulista",
    sector: "Energia Elétrica",
    avgSectorPL: 7.8,
    avgSectorPVP: 1.1,
    avgSectorDY: 7.5,
    refLpa: 3.90,
    refVpa: 27.50,
    refDivs: 2.20,
    refAvgDivs5y: 2.15,
    refDivHistory5y: [
      { year: 2021, amount: 1.85, dy: 7.6 },
      { year: 2022, amount: 2.10, dy: 8.5 },
      { year: 2023, amount: 2.45, dy: 9.6 },
      { year: 2024, amount: 2.15, dy: 8.4 },
      { year: 2025, amount: 2.20, dy: 8.6 }
    ]
  },
  "CPLE6": {
    ticker: "CPLE6",
    name: "Copel - Cia Paranaense de Energia",
    sector: "Energia Elétrica",
    avgSectorPL: 8.5,
    avgSectorPVP: 1.2,
    avgSectorDY: 7.0,
    refLpa: 1.25,
    refVpa: 8.90,
    refDivs: 0.62,
    refAvgDivs5y: 0.65,
    refDivHistory5y: [
      { year: 2021, amount: 0.75, dy: 11.2 },
      { year: 2022, amount: 0.58, dy: 8.4 },
      { year: 2023, amount: 0.62, dy: 7.2 },
      { year: 2024, amount: 0.68, dy: 7.1 },
      { year: 2025, amount: 0.62, dy: 6.8 }
    ]
  },
  "EGIE3": {
    ticker: "EGIE3",
    name: "Engie Brasil Energia S.A.",
    sector: "Energia Elétrica",
    avgSectorPL: 10.2,
    avgSectorPVP: 2.1,
    avgSectorDY: 7.2,
    refLpa: 3.80,
    refVpa: 18.20,
    refDivs: 2.85,
    refAvgDivs5y: 2.70,
    refDivHistory5y: [
      { year: 2021, amount: 2.20, dy: 6.2 },
      { year: 2022, amount: 2.95, dy: 7.6 },
      { year: 2023, amount: 2.80, dy: 6.9 },
      { year: 2024, amount: 2.70, dy: 6.8 },
      { year: 2025, amount: 2.85, dy: 7.2 }
    ]
  },
  "CPFE3": {
    ticker: "CPFE3",
    name: "CPFL Energia S.A.",
    sector: "Energia Elétrica",
    avgSectorPL: 8.6,
    avgSectorPVP: 1.8,
    avgSectorDY: 7.8,
    refLpa: 4.45,
    refVpa: 22.80,
    refDivs: 2.90,
    refAvgDivs5y: 2.85,
    refDivHistory5y: [
      { year: 2021, amount: 2.40, dy: 8.1 },
      { year: 2022, amount: 3.10, dy: 9.5 },
      { year: 2023, amount: 2.95, dy: 8.8 },
      { year: 2024, amount: 2.95, dy: 8.2 },
      { year: 2025, amount: 2.90, dy: 8.0 }
    ]
  },
  "CMIG4": {
    ticker: "CMIG4",
    name: "Cia Energética de Minas Gerais",
    sector: "Energia Elétrica",
    avgSectorPL: 6.2,
    avgSectorPVP: 1.05,
    avgSectorDY: 9.5,
    refLpa: 2.15,
    refVpa: 13.40,
    refDivs: 1.35,
    refAvgDivs5y: 1.25,
    refDivHistory5y: [
      { year: 2021, amount: 0.95, dy: 8.2 },
      { year: 2022, amount: 1.20, dy: 10.5 },
      { year: 2023, amount: 1.35, dy: 11.2 },
      { year: 2024, amount: 1.40, dy: 11.8 },
      { year: 2025, amount: 1.35, dy: 10.9 }
    ]
  },
  "CXSE3": {
    ticker: "CXSE3",
    name: "Caixa Seguridade Participações S.A.",
    sector: "Previdência e Seguros",
    avgSectorPL: 10.2,
    avgSectorPVP: 2.8,
    avgSectorDY: 8.2,
    refLpa: 1.20,
    refVpa: 5.30,
    refDivs: 1.10,
    refAvgDivs5y: 0.95,
    refDivHistory5y: [
      { year: 2021, amount: 0.65, dy: 7.2 },
      { year: 2022, amount: 0.88, dy: 9.5 },
      { year: 2023, amount: 1.05, dy: 8.9 },
      { year: 2024, amount: 1.15, dy: 8.4 },
      { year: 2025, amount: 1.10, dy: 8.2 }
    ]
  },
  "BBSE3": {
    ticker: "BBSE3",
    name: "BB Seguridade Participações S.A.",
    sector: "Previdência e Seguros",
    avgSectorPL: 9.5,
    avgSectorPVP: 4.5,
    avgSectorDY: 9.2,
    refLpa: 3.90,
    refVpa: 7.40,
    refDivs: 3.45,
    refAvgDivs5y: 3.10,
    refDivHistory5y: [
      { year: 2021, amount: 2.15, dy: 9.5 },
      { year: 2022, amount: 3.20, dy: 10.2 },
      { year: 2023, amount: 3.45, dy: 10.8 },
      { year: 2024, amount: 3.50, dy: 9.8 },
      { year: 2025, amount: 3.45, dy: 9.2 }
    ]
  },
  "SAPR11": {
    ticker: "SAPR11",
    name: "Sanepar - Cia de Saneamento do Paraná",
    sector: "Saneamento",
    avgSectorPL: 6.8,
    avgSectorPVP: 0.95,
    avgSectorDY: 7.5,
    refLpa: 3.20,
    refVpa: 23.50,
    refDivs: 1.85,
    refAvgDivs5y: 1.65,
    refDivHistory5y: [
      { year: 2021, amount: 1.35, dy: 6.5 },
      { year: 2022, amount: 1.55, dy: 7.4 },
      { year: 2023, amount: 1.70, dy: 7.6 },
      { year: 2024, amount: 1.80, dy: 7.2 },
      { year: 2025, amount: 1.85, dy: 7.5 }
    ]
  },
  "SBSP3": {
    ticker: "SBSP3",
    name: "Sabesp - Cia de Saneamento Básico de SP",
    sector: "Saneamento",
    avgSectorPL: 11.0,
    avgSectorPVP: 1.5,
    avgSectorDY: 5.2,
    refLpa: 6.50,
    refVpa: 52.00,
    refDivs: 3.80,
    refAvgDivs5y: 2.90,
    refDivHistory5y: [
      { year: 2021, amount: 1.80, dy: 4.8 },
      { year: 2022, amount: 2.40, dy: 5.2 },
      { year: 2023, amount: 3.10, dy: 5.4 },
      { year: 2024, amount: 3.50, dy: 4.8 },
      { year: 2025, amount: 3.80, dy: 5.2 }
    ]
  },
  "ABCB4": {
    ticker: "ABCB4",
    name: "Banco ABC Brasil S.A.",
    sector: "Financeiro / Bancos",
    avgSectorPL: 6.5,
    avgSectorPVP: 0.9,
    avgSectorDY: 9.5,
    refLpa: 3.91,
    refVpa: 27.85,
    refDivs: 2.62,
    refAvgDivs5y: 2.10,
    refDivHistory5y: [
      { year: 2021, amount: 1.45, dy: 8.5 },
      { year: 2022, amount: 1.95, dy: 10.4 },
      { year: 2023, amount: 2.25, dy: 10.8 },
      { year: 2024, amount: 2.50, dy: 10.2 },
      { year: 2025, amount: 2.62, dy: 9.8 }
    ]
  },
  "ITSA4": {
    ticker: "ITSA4",
    name: "Itaúsa S.A.",
    sector: "Financeiro / Holdings",
    avgSectorPL: 6.9,
    avgSectorPVP: 1.1,
    avgSectorDY: 8.2,
    refLpa: 1.55,
    refVpa: 9.80,
    refDivs: 0.92,
    refAvgDivs5y: 0.82,
    refDivHistory5y: [
      { year: 2021, amount: 0.58, dy: 6.4 },
      { year: 2022, amount: 0.74, dy: 7.8 },
      { year: 2023, amount: 0.88, dy: 8.6 },
      { year: 2024, amount: 0.98, dy: 9.4 },
      { year: 2025, amount: 0.92, dy: 8.2 }
    ]
  },
  "VIVT3": {
    ticker: "VIVT3",
    name: "Telefônica Brasil S.A. (Vivo)",
    sector: "Telecomunicações",
    avgSectorPL: 12.2,
    avgSectorPVP: 1.15,
    avgSectorDY: 7.2,
    refLpa: 3.30,
    refVpa: 43.10,
    refDivs: 3.25,
    refAvgDivs5y: 3.10,
    refDivHistory5y: [
      { year: 2021, amount: 2.80, dy: 6.8 },
      { year: 2022, amount: 3.10, dy: 7.5 },
      { year: 2023, amount: 3.25, dy: 7.2 },
      { year: 2024, amount: 3.30, dy: 6.8 },
      { year: 2025, amount: 3.25, dy: 7.2 }
    ]
  },
  "KLBN11": {
    ticker: "KLBN11",
    name: "Klabin S.A.",
    sector: "Papel e Celulose",
    avgSectorPL: 8.2,
    avgSectorPVP: 1.4,
    avgSectorDY: 7.5,
    refLpa: 1.70,
    refVpa: 13.90,
    refDivs: 1.35,
    refAvgDivs5y: 1.28,
    refDivHistory5y: [
      { year: 2021, amount: 0.95, dy: 5.2 },
      { year: 2022, amount: 1.45, dy: 8.5 },
      { year: 2023, amount: 1.30, dy: 7.4 },
      { year: 2024, amount: 1.38, dy: 7.5 },
      { year: 2025, amount: 1.35, dy: 7.2 }
    ]
  },
  "GGBR4": {
    ticker: "GGBR4",
    name: "Gerdau S.A.",
    sector: "Mineração e Siderurgia",
    avgSectorPL: 7.0,
    avgSectorPVP: 0.85,
    avgSectorDY: 6.5,
    refLpa: 2.60,
    refVpa: 28.90,
    refDivs: 1.45,
    refAvgDivs5y: 1.95,
    refDivHistory5y: [
      { year: 2021, amount: 2.80, dy: 11.2 },
      { year: 2022, amount: 2.90, dy: 10.5 },
      { year: 2023, amount: 1.50, dy: 6.8 },
      { year: 2024, amount: 1.10, dy: 5.5 },
      { year: 2025, amount: 1.45, dy: 6.5 }
    ]
  },
  "CSMG3": {
    ticker: "CSMG3",
    name: "Copasa - Cia de Saneamento de MG",
    sector: "Saneamento",
    avgSectorPL: 6.5,
    avgSectorPVP: 0.85,
    avgSectorDY: 9.0,
    refLpa: 3.10,
    refVpa: 24.20,
    refDivs: 2.10,
    refAvgDivs5y: 1.75,
    refDivHistory5y: [
      { year: 2021, amount: 1.15, dy: 7.2 },
      { year: 2022, amount: 1.45, dy: 9.1 },
      { year: 2023, amount: 1.85, dy: 10.5 },
      { year: 2024, amount: 2.20, dy: 10.2 },
      { year: 2025, amount: 2.10, dy: 9.0 }
    ]
  },
  "WEGE3": {
    ticker: "WEGE3",
    name: "WEG S.A.",
    sector: "Bens Industriais / Motores",
    avgSectorPL: 28.5,
    avgSectorPVP: 7.5,
    avgSectorDY: 2.2,
    refLpa: 1.45,
    refVpa: 4.80,
    refDivs: 0.95,
    refAvgDivs5y: 0.72,
    refDivHistory5y: [
      { year: 2021, amount: 0.52, dy: 1.8 },
      { year: 2022, amount: 0.65, dy: 1.9 },
      { year: 2023, amount: 0.74, dy: 2.0 },
      { year: 2024, amount: 0.88, dy: 2.1 },
      { year: 2025, amount: 0.95, dy: 2.2 }
    ]
  }
};

function parsePtBrNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/\./g, '').replace(',', '.').replace('%', '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

async function fetchFundamentus(ticker: string) {
  try {
    const cleanTicker = ticker.replace(/\.SA$/i, '').toUpperCase();
    const url = `https://www.fundamentus.com.br/detalhes.php?papel=${cleanTicker}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), T.fund);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder('latin1').decode(buffer);
    
    const getField = (label: string) => {
      const regex = new RegExp('<span class="txt">' + label + '</span>[\\s\\S]*?<span class="txt">([\\s\\S]*?)</span>', 'i');
      const m = html.match(regex);
      return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
    };

    const lpaRaw = getField('LPA');
    const vpaRaw = getField('VPA');
    const empresa = getField('Empresa');
    const setor = getField('Setor');
    const subsetor = getField('Subsetor');
    const dyRaw = getField('Div\\. Yield');
    const plRaw = getField('P/L');
    const pvpRaw = getField('P/VP');

    if (!lpaRaw && !vpaRaw) return null;

    return {
      companyName: empresa || undefined,
      sector: setor ? (subsetor ? `${setor} / ${subsetor}` : setor) : undefined,
      lpa: parsePtBrNumber(lpaRaw),
      vpa: parsePtBrNumber(vpaRaw),
      dy: parsePtBrNumber(dyRaw),
      pl: parsePtBrNumber(plRaw),
      pvp: parsePtBrNumber(pvpRaw)
    };
  } catch (e) {
    return null;
  }
}

async function fetchYahooData(ticker: string) {
  try {
    const formatted = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formatted}?range=6y&interval=1mo&events=div`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), T.yahoo);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta?.regularMarketPrice || meta?.chartPreviousClose || 0;
    const name = meta?.shortName || meta?.longName || ticker;

    // Proventos: 12 meses contados a partir de hoje e média de 5 anos incluindo anos sem pagamento
    const divsObj = result?.events?.dividends || {};
    const divEntries = Object.entries(divsObj).map(([tsStr, divItem]: [string, any]) => ({
      date: Number(divItem?.date) || parseInt(tsStr, 10),
      amount: Number(divItem?.amount) || 0
    }));
    const timestamps: number[] = result.timestamp || [];
    const firstTradeYear = timestamps.length ? new Date(timestamps[0] * 1000).getUTCFullYear() : undefined;
    // O Yahoo devolve no máximo ~6 anos; se o primeiro candle é do início da janela, a ação já existia antes.
    const windowStart = fiveYears()[0];
    const { dividends12m, dividendHistory5y, avgDividends5y } = summarizeDividends(
      divEntries,
      new Date(),
      firstTradeYear && firstTradeYear > windowStart ? firstTradeYear : undefined,
    );

    // Historical candles
    const quoteIndicators = result.indicators?.quote?.[0] || {};
    const opens = quoteIndicators.open || [];
    const closes = quoteIndicators.close || [];
    const highs = quoteIndicators.high || [];
    const lows = quoteIndicators.low || [];

    const yearDataMap: Record<number, { open: number[]; close: number[]; high: number[]; low: number[] }> = {};
    timestamps.forEach((ts: number, idx: number) => {
      const date = new Date(ts * 1000);
      const year = date.getFullYear();
      if (year >= windowStart) {
        if (!yearDataMap[year]) {
          yearDataMap[year] = { open: [], close: [], high: [], low: [] };
        }
        if (opens[idx] != null) yearDataMap[year].open.push(opens[idx]);
        if (closes[idx] != null) yearDataMap[year].close.push(closes[idx]);
        if (highs[idx] != null) yearDataMap[year].high.push(highs[idx]);
        if (lows[idx] != null) yearDataMap[year].low.push(lows[idx]);
      }
    });

    const historicalData = Object.keys(yearDataMap).map(yrStr => {
      const year = parseInt(yrStr, 10);
      const yrData = yearDataMap[year];
      const open = yrData.open[0] || price;
      const close = yrData.close[yrData.close.length - 1] || price;
      const high = Math.max(...yrData.high, close, open);
      const low = Math.min(...yrData.low.filter(v => v > 0), close, open);
      return {
        year,
        open: Number(open.toFixed(2)),
        close: Number(close.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        pl: 0,
        pvp: 0,
        dy: 0
      };
    });

    // Série mensal de fechamento (para o gráfico de preço com as faixas de Graham e Bazin)
    const monthly = timestamps
      .map((ts: number, idx: number) => ({ t: ts * 1000, close: closes[idx] }))
      .filter((p: { t: number; close: number | null }) => p.close != null && p.close > 0)
      .map((p: { t: number; close: number }) => ({ t: p.t, close: Number(p.close.toFixed(2)) }));

    return {
      price: Number(price.toFixed(2)),
      name,
      dividends12m,
      avgDividends5y,
      dividendHistory5y,
      historicalData,
      monthly
    };
  } catch (e) {
    return null;
  }
}

async function getCompleteStockData(tickerInput: string) {
  const cleanTicker = normalizeTicker(tickerInput);
  // Só códigos no formato da B3 chegam às fontes externas (evita injeção na URL)
  if (!isValidTicker(cleanTicker)) {
    const err: any = new Error('Código inválido. Use o formato da B3, como PETR4 ou TAEE11.');
    err.status = 400;
    throw err;
  }
  const cacheKey = `stock_${cleanTicker}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const known = KNOWN_B3_STOCKS[cleanTicker];

  const [yahooResult, fundamentusResult] = await Promise.allSettled([
    fetchYahooData(cleanTicker),
    fetchFundamentus(cleanTicker)
  ]);

  const yahoo = yahooResult.status === 'fulfilled' ? yahooResult.value : null;
  const fund = fundamentusResult.status === 'fulfilled' ? fundamentusResult.value : null;

  // ---------------------------------------------------------------
  // Qualidade dos dados: cada campo informa DE ONDE veio.
  // 'live' = fonte online agora | 'reference' = tabela interna | 'estimated' = aproximação
  // O app mostra isso ao usuário em vez de esconder valores inventados.
  // ---------------------------------------------------------------
  type Quality = 'live' | 'reference' | 'estimated' | 'missing';
  const quality: Record<string, Quality> = {};
  const warnings: string[] = [];

  let price = yahoo?.price || 0;
  quality.price = price > 0 ? 'live' : 'missing';
  if (!price && fund?.pl && fund.pl > 0 && fund.lpa > 0) {
    price = Number((fund.pl * fund.lpa).toFixed(2));
    quality.price = 'estimated';
    warnings.push('Cotação estimada a partir de P/L × LPA (Yahoo indisponível).');
  }
  if (!price) {
    // Sem cotação não há valuation honesto — o cliente mostra erro claro.
    const err: any = new Error(`Não encontramos cotação para ${cleanTicker}. Confira o código ou tente novamente em instantes.`);
    err.status = 404;
    throw err;
  }

  let lpa = fund?.lpa || 0;
  let vpa = fund?.vpa || 0;
  quality.fundamentals = fund && (fund.lpa || fund.vpa) ? 'live' : 'missing';
  if (!fund && known) {
    lpa = known.refLpa; vpa = known.refVpa; quality.fundamentals = 'reference';
    warnings.push('LPA/VPA vindos da tabela de referência interna (Fundamentus indisponível).');
  }

  let dividends = 0;
  quality.dividends = 'missing';
  if (yahoo && yahoo.dividends12m > 0) {
    dividends = yahoo.dividends12m; quality.dividends = 'live';
  } else if (fund && fund.dy > 0) {
    dividends = Number(((fund.dy / 100) * price).toFixed(2)); quality.dividends = 'live';
  } else if (known && known.refDivs > 0) {
    dividends = known.refDivs; quality.dividends = 'reference';
    warnings.push('Proventos de 12 meses vindos da tabela de referência interna.');
  }

  // 5-year average dividends and history
  const yahooHasHistory = !!(yahoo && yahoo.dividendHistory5y && yahoo.dividendHistory5y.some(d => d.amount > 0));
  let dividendHistory5y: DividendYearPoint[] = yahooHasHistory
    ? yahoo!.dividendHistory5y
    : (known ? known.refDivHistory5y : []);
  quality.history = yahooHasHistory ? 'live' : known ? 'reference' : 'missing';
  if (!yahooHasHistory && !known) warnings.push('Sem histórico de 5 anos: o Bazin usa os proventos de 12 meses.');

  // Média 5a vem da MESMA fonte do histórico exibido (antes podiam divergir)
  const avgDividends5y = yahooHasHistory
    ? yahoo!.avgDividends5y
    : (known ? known.refAvgDivs5y : dividends);

  const payoutConsistencyYears = dividendHistory5y.filter(d => d.amount > 0).length;

  const companyName = fund?.companyName || known?.name || yahoo?.name || cleanTicker;
  const sectorName = fund?.sector || known?.sector || "Mercado B3";
  const avgPL = known?.avgSectorPL || 9.5;
  const avgPVP = known?.avgSectorPVP || 1.3;
  const avgDY = known?.avgSectorDY || 6.5;
  if (!known) warnings.push('Médias setoriais genéricas (P/L 9,5 · P/VP 1,3) — ativo fora da base de referência.');

  const historical = yahoo?.historicalData && yahoo.historicalData.length > 0
    ? yahoo.historicalData.map(h => ({
        ...h,
        pl: lpa > 0 ? Number((h.close / lpa).toFixed(2)) : 0,
        pvp: vpa > 0 ? Number((h.close / vpa).toFixed(2)) : 0,
        // DY do ano = proventos pagos NAQUELE ano ÷ fechamento do ano (antes usava os proventos de hoje)
        dy: (() => {
          const paid = dividendHistory5y.find(d => d.year === h.year)?.amount || 0;
          return h.close > 0 && paid > 0 ? Number(((paid / h.close) * 100).toFixed(2)) : 0;
        })()
      }))
    : [];

  const quickSummary = `${companyName} (${cleanTicker}) atua no segmento de ${sectorName}. Cotação atual: R$ ${price.toFixed(2)}, com proventos acumulados em 12 meses de R$ ${dividends.toFixed(2)} por ação (Média 5 anos: R$ ${avgDividends5y.toFixed(2)}).`;

  const fullData = {
    ticker: cleanTicker,
    companyName,
    currentPrice: price,
    lpa,
    vpa,
    dividends,
    avgDividends5y,
    dividendHistory5y,
    payoutConsistencyYears,
    pl: lpa > 0 ? Number((price / lpa).toFixed(2)) : 0,
    pvp: vpa > 0 ? Number((price / vpa).toFixed(2)) : 0,
    quickSummary,
    sector: {
      sectorName,
      avgPL,
      avgPVP,
      avgDY
    },
    historicalData: historical,
    priceHistory: yahoo?.monthly || [],
    dataQuality: quality,
    warnings,
    lastUpdated: Date.now()
  };

  if (memoryCache.size >= CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(cacheKey, { data: fullData, timestamp: Date.now() });
  return fullData;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Radar de Oportunidades (Screener completo de ações da B3)
app.get('/api/stock/radar', async (req: Request, res: Response) => {
  try {
    // Yield mínimo do usuário (padrão Bazin 6%), limitado a 3–15%
    const minYield = Math.min(15, Math.max(3, Number(req.query.minYield) || DEFAULT_MIN_YIELD));
    const list = Object.values(KNOWN_B3_STOCKS);
    const radarData = await Promise.all(list.map(async (stock) => {
      try {
        const d = await getCompleteStockData(stock.ticker);
        const price = d.currentPrice;
        const lpa = d.lpa;
        const vpa = d.vpa;
        const divs12m = d.dividends;
        const avgDivs5y = d.avgDividends5y || divs12m;

        const grahamFair = round(grahamFairPrice(lpa, vpa));
        const grahamUpside = round(upsidePct(grahamFair, price), 1);

        const bazinCeiling12m = round(bazinCeilingPrice(divs12m, minYield));
        const bazinUpside12m = round(upsidePct(bazinCeiling12m, price), 1);

        const bazinCeiling5y = round(bazinCeilingPrice(avgDivs5y, minYield));
        const bazinUpside5y = round(upsidePct(bazinCeiling5y, price), 1);

        const dy = price > 0 && divs12m > 0 ? round((divs12m / price) * 100) : 0;
        const pl = lpa > 0 ? round(price / lpa) : 0;
        const pvp = vpa > 0 ? round(price / vpa) : 0;

        const score = valorizeScore({
          price, lpa, vpa, dividends12m: divs12m, avgDividends5y: avgDivs5y,
          dividendYears: (d.dividendHistory5y || []).map((x: DividendYearPoint) => x.amount),
          sectorPL: d.sector?.avgPL, sectorPVP: d.sector?.avgPVP, minYield,
        });

        let status: 'COMPRA_FORTE' | 'COMPRA' | 'ABAIXO_TETO' | 'AGUARDAR' | 'CARO' = 'AGUARDAR';
        if (grahamUpside > 15 && bazinUpside5y > 10) {
          status = 'COMPRA_FORTE';
        } else if (bazinUpside5y > 0 || bazinUpside12m > 0) {
          status = 'ABAIXO_TETO';
        } else if (grahamUpside > 0) {
          status = 'COMPRA';
        } else if (grahamUpside < -10 && bazinUpside5y < -10) {
          status = 'CARO';
        }

        return {
          ticker: d.ticker,
          name: d.companyName,
          sector: d.sector?.sectorName || stock.sector,
          price,
          lpa,
          vpa,
          dividends12m: divs12m,
          avgDividends5y: avgDivs5y,
          dividendHistory5y: d.dividendHistory5y,
          dy,
          pl,
          pvp,
          grahamFair,
          grahamUpside,
          bazinCeiling12m,
          bazinCeiling5y,
          bazinUpside12m,
          bazinUpside5y,
          status,
          score: score.total,
          grade: score.grade,
          dataQuality: d.dataQuality
        };
      } catch (e) {
        return null;
      }
    }));

    return res.json(radarData.filter(Boolean));
  } catch (error: any) {
    console.error("Error in radar API:", error);
    return res.status(500).json({ error: "Erro ao gerar Radar de Oportunidades." });
  }
});

// 2. Multi-stock comparator endpoint (must come before /:ticker)
app.get('/api/stock/compare', async (req: Request, res: Response) => {
  try {
    const tickersParam = req.query.tickers as string;
    if (!tickersParam) {
      return res.status(400).json({ error: "Parâmetro 'tickers' é obrigatório" });
    }

    const minYield = Math.min(15, Math.max(3, Number(req.query.minYield) || DEFAULT_MIN_YIELD));
    const tickers = Array.from(new Set(tickersParam.split(',').map(normalizeTicker).filter(isValidTicker)));
    if (tickers.length === 0) return res.status(400).json({ error: 'Informe códigos válidos da B3, separados por vírgula.' });
    // Cada ação dispara 2 consultas externas: limitamos para evitar abuso
    if (tickers.length > 10) return res.status(400).json({ error: 'Compare até 10 ações por vez.' });
    const results = await Promise.all(tickers.map(async (t) => {
      try {
        const d = await getCompleteStockData(t);
        const grahamFair = grahamFairPrice(d.lpa, d.vpa);
        const bazinFair = bazinCeilingPrice(d.dividends, minYield);
        const bazinFair5y = bazinCeilingPrice(d.avgDividends5y || d.dividends, minYield);
        const upside = d.currentPrice > 0 && grahamFair > 0 ? ((grahamFair / d.currentPrice) - 1) * 100 : 0;

        return {
          ticker: d.ticker,
          name: d.companyName,
          price: d.currentPrice,
          lpa: d.lpa,
          vpa: d.vpa,
          dividends: d.dividends,
          avgDividends5y: d.avgDividends5y || d.dividends,
          dividendHistory5y: d.dividendHistory5y,
          pl: d.lpa > 0 ? Number((d.currentPrice / d.lpa).toFixed(2)) : 0,
          pvp: d.vpa > 0 ? Number((d.currentPrice / d.vpa).toFixed(2)) : 0,
          dy: d.currentPrice > 0 ? Number(((d.dividends / d.currentPrice) * 100).toFixed(2)) : 0,
          grahamFair: Number(grahamFair.toFixed(2)),
          bazinFair: Number(bazinFair.toFixed(2)),
          bazinFair5y: Number(bazinFair5y.toFixed(2)),
          upside: Number(upside.toFixed(1)),
          sector: d.sector?.sectorName,
          dataQuality: d.dataQuality
        };
      } catch (e) {
        return null;
      }
    }));

    return res.json(results.filter(Boolean));
  } catch (error: any) {
    console.error("Error in compare API:", error);
    return res.status(500).json({ error: "Erro ao comparar ações." });
  }
});

// 3. Search endpoint with ticker + company name matching
app.get('/api/stock/search', async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const list = Object.values(KNOWN_B3_STOCKS);
    if (!q) {
      return res.json(list.slice(0, 20).map(s => ({
        ticker: s.ticker,
        name: s.name,
        sector: s.sector
      })));
    }

    const matches = list.filter(s => 
      s.ticker.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    ).map(s => ({
      ticker: s.ticker,
      name: s.name,
      sector: s.sector
    }));

    const cleanQ = q.toUpperCase();
    if (cleanQ.length >= 4 && !matches.some(m => m.ticker === cleanQ)) {
      matches.unshift({
        ticker: cleanQ,
        name: `Ação ${cleanQ} (B3)`,
        sector: "Bolsa de Valores B3"
      });
    }

    return res.json(matches.slice(0, 15));
  } catch (error: any) {
    return res.status(500).json({ error: "Erro na busca" });
  }
});

// 4. Single stock data endpoint
app.get('/api/stock/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!isValidTicker(ticker)) {
      return res.status(400).json({ error: "Ticker inválido. Informe um código como PETR4 ou VALE3." });
    }

    const data = await getCompleteStockData(ticker);
    return res.json(data);
  } catch (error: any) {
    console.error("Error fetching stock:", error?.message);
    const status = error?.status || 500;
    // Sem detalhes internos na resposta: a mensagem técnica fica só no log do servidor
    return res.status(status).json({ error: status < 500 ? error.message : "Erro ao consultar dados da ação. Tente novamente em instantes." });
  }
});

// 5. Server-Side AI Analysis with Gemini 3.8 Flash
app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  try {
    // Validação da entrada: só números finitos e textos curtos entram no prompt
    const body = req.body || {};
    const ticker = normalizeTicker(body.ticker);
    if (!isValidTicker(ticker)) {
      return res.status(400).json({ error: "Informe um código válido da B3." });
    }
    const currentPrice = finiteNumber(body.currentPrice, 0, 1e6);
    const lpa = finiteNumber(body.lpa, -1e5, 1e5);
    const vpa = finiteNumber(body.vpa, -1e5, 1e5);
    const dividends = finiteNumber(body.dividends, 0, 1e5);
    const avgDividends5y = finiteNumber(body.avgDividends5y, 0, 1e5);
    const companyName = cleanText(body.companyName);
    const minYield = Math.min(15, Math.max(3, Number(body.minYield) || DEFAULT_MIN_YIELD));

    const prompt = `Você é um analista e educador financeiro especialista em ações da B3 (Brasil).
Analise a ação ${ticker} (${companyName || ''}) para um investidor pessoa física, considerando estes dados de mercado:
- Cotação Atual: R$ ${currentPrice || 0}
- LPA: R$ ${lpa || 0}
- VPA: R$ ${vpa || 0}
- Proventos 12m: R$ ${dividends || 0}
- Média Proventos 5 Anos: R$ ${avgDividends5y || dividends || 0}
- Preço Justo de Graham: R$ ${lpa > 0 && vpa > 0 ? Math.sqrt(22.5 * lpa * vpa).toFixed(2) : 'N/D'}
- Preço Teto Bazin (${minYield}% sobre Média 5a): R$ ${(avgDividends5y || dividends) > 0 ? ((avgDividends5y || dividends) / (minYield / 100)).toFixed(2) : 'N/D'}

Instruções:
- Seja didático, claro e objetivo.
- Avalie o desconto pelo Preço Justo de Graham e pelo Preço Teto de Décio Bazin (destacando a média de 5 anos).
- Estruture sua resposta nas 3 seções:

1. O QUE ESTÁ ACONTECENDO?
(Modelo de negócio, momento atual da empresa e fatos relevantes)

2. PONTOS FORTES E RISCOS
(Vantagens competitivas e principais riscos a monitorar)

3. CONCLUSÃO PARA VOCÊ
(Recomendação prática de compra/espera e disciplina de alocação)`;

    let analysisText = "";

    try {
      if (apiKey) {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout waiting for model response")), T.ai)
        );
        const aiPromise = ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            maxOutputTokens: 1200,
            temperature: 0.3,
          }
        });

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        analysisText = response?.text || "";
      }
    } catch (aiErr: any) {
      console.log(`AI synthesis fallback active for ${ticker}: ${aiErr?.message || 'standard'}`);
    }

    // Sem resposta do modelo: devolvemos um resumo automático e AVISAMOS que não é da IA
    const fromAi = !!analysisText;
    if (!analysisText) {
      const p = Number(currentPrice) || 1;
      const gPrice = lpa > 0 && vpa > 0 ? Math.sqrt(22.5 * lpa * vpa) : 0;
      const bPrice = (avgDividends5y || dividends) > 0 ? (avgDividends5y || dividends) / (minYield / 100) : 0;
      const dy = Number(((dividends / p) * 100).toFixed(2));

      analysisText = `1. O QUE ESTÁ ACONTECENDO?\nA empresa ${ticker} (${companyName || 'B3'}) negocia a R$ ${p.toFixed(2)} com proventos pagos nos últimos 12 meses de R$ ${dividends.toFixed(2)} por ação (Yield de ${dy}%) e média de 5 anos de R$ ${(avgDividends5y || dividends).toFixed(2)} por ação.\n\n2. PONTOS FORTES E RISCOS\n• Método de Graham: Valor intrínseco estimado de R$ ${gPrice.toFixed(2)}.${gPrice > p ? ' Ativo com desconto patrimonial e de lucros.' : ''}\n• Método de Bazin: Com base na média dos últimos 5 anos de proventos (yield mín. ${minYield}%), o preço teto estimado é de R$ ${bPrice.toFixed(2)}.${bPrice > p ? ' Ativo dentro da margem de segurança para dividendos.' : ' Cotação acima do teto estipulado.'}\n• Riscos a Monitorar: Cenário macroeconômico, taxa Selic e volatilidade setorial.\n\n3. CONCLUSÃO PARA VOCÊ\n${ticker} atende aos critérios fundamentais para compor carteira previdenciária se comprada abaixo de R$ ${bPrice.toFixed(2)}. Mantenha disciplina de aportes regulares e diversificação.`;
    }

    return res.json({
      ticker,
      source: fromAi ? 'ia' : 'automatico',
      analysis: analysisText,
      sources: [
        { web: { title: "B3 - Brasil, Bolsa, Balcão", uri: "https://www.b3.com.br" } },
        { web: { title: `Relações com Investidores ${ticker}`, uri: `https://www.google.com/search?q=${ticker}+RI+relacoes+investidores` } }
      ]
    });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return res.status(500).json({ error: "Erro ao gerar análise de IA." });
  }
});

