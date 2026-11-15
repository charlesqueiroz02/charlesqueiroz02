import {
  Radar,
  ScanSearch,
  FlaskConical,
  Coins,
  Briefcase,
  Calculator,
  Zap,
  TrendingUp,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export type TabId =
  | 'radar' | 'raio-x' | 'laboratorio' | 'renda' | 'portfolio'
  | 'calculadora' | 'otimizador' | 'juros-compostos' | 'cadastro';

export interface TabDef {
  id: TabId;
  label: string;
  short: string; // rótulo curto para a barra inferior do celular
  icon: LucideIcon;
  mobilePrimary?: boolean;
  isNew?: boolean;
}

/** Ordem e nomes das telas em UM lugar só — fácil de reorganizar. */
export const TABS: TabDef[] = [
  { id: 'radar', label: 'Radar', short: 'Radar', icon: Radar, mobilePrimary: true },
  { id: 'raio-x', label: 'Raio-X do ativo', short: 'Raio-X', icon: ScanSearch, mobilePrimary: true },
  { id: 'laboratorio', label: 'Laboratório', short: 'Lab', icon: FlaskConical, mobilePrimary: true, isNew: true },
  { id: 'renda', label: 'Máquina de Renda', short: 'Renda', icon: Coins, mobilePrimary: true, isNew: true },
  { id: 'portfolio', label: 'Carteira', short: 'Carteira', icon: Briefcase },
  { id: 'calculadora', label: 'Calculadora', short: 'Calc.', icon: Calculator },
  { id: 'otimizador', label: 'Otimizador de aportes', short: 'Aportes', icon: Zap },
  { id: 'juros-compostos', label: 'Juros compostos', short: 'Juros', icon: TrendingUp },
  { id: 'cadastro', label: 'Minha conta', short: 'Conta', icon: UserCheck },
];
