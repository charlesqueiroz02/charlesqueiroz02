export interface HistoricalPoint {
  year: number;
  pl: number;
  pvp: number;
  dy: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface DividendYearPoint {
  year: number;
  amount: number;
  dy?: number;
}

export interface PortfolioItem {
  ticker: string;
  purchasePrice: number;
  quantity: number;
  addedAt: number;
  alertPrice?: number;
  alertCondition?: 'above' | 'below';
}

export interface SectorData {
  sectorName: string;
  avgPL: number;
  avgPVP: number;
  avgDY: number;
}

export type DataQuality = 'live' | 'reference' | 'estimated' | 'missing';

export interface StockData {
  ticker: string;
  companyName?: string;
  currentPrice: number;
  lpa: number;
  vpa: number;
  dividends: number; // 12-month actual dividends
  avgDividends5y?: number; // 5-year average annual dividends
  dividendHistory5y?: DividendYearPoint[];
  payoutConsistencyYears?: number;
  bazinMethodMode?: '12m' | '5y';
  marginOfSafety: number;
  minYield: number;
  pl?: number;
  pvp?: number;
  roe?: number;
  sector?: SectorData;
  quickSummary?: string;
  historicalData?: HistoricalPoint[];
  portfolioInfo?: PortfolioItem;
  lastUpdated?: number;
  dataQuality?: Record<string, DataQuality>;
  warnings?: string[];
}

export interface ValuationResult {
  grahamFairPrice: number;
  grahamEntryPrice: number;
  grahamUpside: number;
  grahamStatus: 'COMPRA' | 'AGUARDAR' | 'VENDA';
  
  bazinCeilingPrice: number;
  bazinEntryPrice: number;
  bazinUpside: number;
  bazinStatus: 'COMPRA' | 'AGUARDAR' | 'VENDA';

  bazinCeilingPrice12m: number;
  bazinCeilingPrice5y: number;
}

export interface RadarStockItem {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  lpa: number;
  vpa: number;
  dividends12m: number;
  avgDividends5y: number;
  dividendHistory5y?: DividendYearPoint[];
  dy: number;
  pl: number;
  pvp: number;
  grahamFair: number;
  grahamUpside: number;
  bazinCeiling12m: number;
  bazinCeiling5y: number;
  bazinUpside12m: number;
  bazinUpside5y: number;
  status: 'COMPRA_FORTE' | 'COMPRA' | 'ABAIXO_TETO' | 'AGUARDAR' | 'CARO';
  score?: number;
  grade?: string;
  dataQuality?: Record<string, DataQuality>;
}

export interface OptimizerAsset {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  currentShares: number;
  targetWeight: number; // e.g. 25%
  grahamFair?: number;
  bazinCeiling?: number;
}

export interface AllocationRecommendation {
  ticker: string;
  name: string;
  currentPrice: number;
  currentShares: number;
  currentTotal: number;
  currentWeight: number;
  targetWeight: number;
  sharesToBuy: number;
  investmentAmount: number;
  newSharesTotal: number;
  newTotal: number;
  newWeight: number;
  bazinCeiling: number;
  upside: number;
  isDiscounted: boolean;
}

export interface OptimizerResult {
  totalContribution: number;
  allocatedAmount: number;
  residualCash: number;
  recommendations: AllocationRecommendation[];
}

export type RiskProfile = 'conservador' | 'moderado' | 'arrojado';
export type InvestmentStrategy = 'dividendos_bazin' | 'valor_graham' | 'crescimento' | 'misto';
export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  riskProfile: RiskProfile;
  strategy: InvestmentStrategy;
  experienceLevel: ExperienceLevel;
  monthlyContribution: number;
  monthlyDividendGoal: number;
  defaultMarginOfSafety: number;
  defaultMinYield: number;
  watchlist: string[];
  acceptedTerms: boolean;
  createdAt: number;
  lastLogin: number;
}

export interface UserAccount {
  id: string;
  profile: UserProfile;
  portfolio: PortfolioItem[];
  passwordHash?: string;
}

export interface AuthState {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

