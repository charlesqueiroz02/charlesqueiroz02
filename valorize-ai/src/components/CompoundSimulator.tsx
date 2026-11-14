import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  TrendingUp, 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  Wallet,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Scale
} from 'lucide-react';
import { StockData } from '../types';

interface CompoundSimulatorProps {
  currentStock?: StockData;
}

export const CompoundSimulator: React.FC<CompoundSimulatorProps> = ({ currentStock }) => {
  const stockPrice = currentStock?.currentPrice || 21.80;
  const stockDivs = currentStock?.dividends || 1.65;
  const initialStockDy = stockPrice > 0 ? Number(((stockDivs / stockPrice) * 100).toFixed(1)) : 8.0;

  const [initialInvestment, setInitialInvestment] = useState<number>(5000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(600);
  const [dividendYield, setDividendYield] = useState<number>(initialStockDy || 8.0);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(4.0); // 4% annual growth
  const [ipcaRate, setIpcaRate] = useState<number>(4.5); // 4.5% annual inflation
  const [years, setYears] = useState<number>(15);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [viewRealPurchasingPower, setViewRealPurchasingPower] = useState<boolean>(true);

  // Magic Number Calculation:
  // How many shares are needed so that monthly dividend >= 1 share price?
  // Monthly Div per share = stockDivs / 12
  // Magic Number = stockPrice / (stockDivs / 12) = (stockPrice * 12) / stockDivs
  const magicNumberShares = useMemo(() => {
    if (stockDivs <= 0 || stockPrice <= 0) return 100;
    const monthlyPerShare = stockDivs / 12;
    return Math.ceil(stockPrice / monthlyPerShare);
  }, [stockPrice, stockDivs]);

  const magicNumberCost = magicNumberShares * stockPrice;

  // Compound simulation engine
  const simulation = useMemo(() => {
    let balanceNominal = initialInvestment;
    let totalInvested = initialInvestment;
    
    let monthMagicNumberReached: number | null = null;
    let milestoneSalaryMonth: number | null = null;
    let milestone3kMonth: number | null = null;
    let milestone5kMonth: number | null = null;
    let milestone10kMonth: number | null = null;

    const yearlyRecords = [];

    const monthlyInflationRate = ipcaRate / 100 / 12;

    // Corrigido: antes o YIELD crescia todo ano sobre o patrimônio (8% virava ~14% em 15 anos).
    // Modelo correto: o yield sobre o valor de mercado fica constante; preços e proventos
    // crescem juntos à taxa informada (valorização das cotas).
    const monthlyDivRate = dividendYield / 100 / 12;
    const monthlyGrowth = Math.pow(1 + dividendGrowthRate / 100, 1 / 12) - 1;

    for (let month = 1; month <= years * 12; month++) {

      // Accumulated inflation discount factor: (1 + i)^-month
      const inflationDiscountFactor = Math.pow(1 + monthlyInflationRate, -month);

      totalInvested += monthlyContribution;

      // Monthly dividend earned
      const monthlyDividend = balanceNominal * monthlyDivRate;

      // Número mágico: provento do mês compra 1 ação (a cotação também sobe com o tempo)
      const priceNow = stockPrice * Math.pow(1 + monthlyGrowth, month);
      if (!monthMagicNumberReached && monthlyDividend >= priceNow) {
        monthMagicNumberReached = month;
      }

      // Check Passive Income Milestones (in current purchasing power or nominal)
      const adjustedMonthlyDiv = viewRealPurchasingPower ? (monthlyDividend * inflationDiscountFactor) : monthlyDividend;
      
      if (!milestoneSalaryMonth && adjustedMonthlyDiv >= 1518) {
        milestoneSalaryMonth = month;
      }
      if (!milestone3kMonth && adjustedMonthlyDiv >= 3000) {
        milestone3kMonth = month;
      }
      if (!milestone5kMonth && adjustedMonthlyDiv >= 5000) {
        milestone5kMonth = month;
      }
      if (!milestone10kMonth && adjustedMonthlyDiv >= 10000) {
        milestone10kMonth = month;
      }

      balanceNominal = balanceNominal * (1 + monthlyGrowth) + monthlyContribution + (reinvestDividends ? monthlyDividend : 0);

      if (month % 12 === 0) {
        const yr = month / 12;
        const discountYr = Math.pow(1 + (ipcaRate / 100), -yr);
        yearlyRecords.push({
          year: yr,
          totalInvested: Math.round(totalInvested),
          nominalBalance: Math.round(balanceNominal),
          realBalance: Math.round(balanceNominal * discountYr),
          nominalMonthlyDiv: Math.round(balanceNominal * monthlyDivRate),
          realMonthlyDiv: Math.round(balanceNominal * monthlyDivRate * discountYr)
        });
      }
    }

    const finalDiscount = Math.pow(1 + (ipcaRate / 100), -years);
    const finalNominalBalance = balanceNominal;
    const finalRealBalance = balanceNominal * finalDiscount;

    const finalNominalMonthlyDiv = finalNominalBalance * monthlyDivRate;
    const finalRealMonthlyDiv = finalNominalMonthlyDiv * finalDiscount;

    return {
      finalNominalBalance,
      finalRealBalance,
      totalInvested,
      finalNominalMonthlyDiv,
      finalRealMonthlyDiv,
      monthMagicNumberReached,
      milestoneSalaryMonth,
      milestone3kMonth,
      milestone5kMonth,
      milestone10kMonth,
      records: yearlyRecords
    };
  }, [
    initialInvestment, 
    monthlyContribution, 
    dividendYield, 
    dividendGrowthRate, 
    ipcaRate, 
    years, 
    reinvestDividends, 
    viewRealPurchasingPower, 
    stockPrice
  ]);

  const displayedBalance = viewRealPurchasingPower ? simulation.finalRealBalance : simulation.finalNominalBalance;
  const displayedMonthlyDiv = viewRealPurchasingPower ? simulation.finalRealMonthlyDiv : simulation.finalNominalMonthlyDiv;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-white data-grid-border p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded">
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">
              Planejamento Previdenciário com IPCA Real
            </span>
          </div>
          <h2 className="font-serif italic text-2xl text-zinc-900 tracking-tight">
            Projeção de Juros Compostos & Bola de Neve
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl mt-1">
            Simule o acúmulo de patrimônio descontando a inflação real (IPCA), descubra seu <strong>Número Mágico</strong> e saiba quando atingirá a independência financeira em dividendos.
          </p>
        </div>

        {/* Inflation Toggle */}
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
          <button
            onClick={() => setViewRealPurchasingPower(true)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              viewRealPurchasingPower 
                ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Poder de Compra Real (Descontado IPCA)
          </button>
          <button
            onClick={() => setViewRealPurchasingPower(false)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              !viewRealPurchasingPower 
                ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Valores Nominais
          </button>
        </div>
      </div>

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs Column */}
        <div className="lg:col-span-5 bg-white data-grid-border p-6 rounded-xl shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="font-serif italic text-lg text-zinc-900">Parâmetros da Simulação</h3>
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
              Ativo Base: {currentStock?.ticker || "B3"}
            </span>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Aporte Inicial</span>
              <span className="text-xs font-mono font-bold text-zinc-900">R$ {initialInvestment.toLocaleString('pt-BR')}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="200000" 
              step="1000"
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(Number(e.target.value))}
              className="w-full accent-emerald-600 h-1"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Aporte Mensal</span>
              <span className="text-xs font-mono font-bold text-zinc-900">R$ {monthlyContribution.toLocaleString('pt-BR')}/mês</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="20000" 
              step="100"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full accent-emerald-600 h-1"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Dividend Yield Inicial (% a.a.)</span>
              <span className="text-xs font-mono font-bold text-emerald-700">{dividendYield}% a.a.</span>
            </div>
            <input 
              type="range" 
              min="3" 
              max="16" 
              step="0.5"
              value={dividendYield}
              onChange={(e) => setDividendYield(Number(e.target.value))}
              className="w-full accent-emerald-600 h-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono" title="Valorização anual esperada das cotações e dos proventos">Crescimento</span>
                <span className="text-xs font-mono font-bold text-zinc-900">{dividendGrowthRate}% a.a.</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="12" 
                step="0.5"
                value={dividendGrowthRate}
                onChange={(e) => setDividendGrowthRate(Number(e.target.value))}
                className="w-full accent-emerald-600 h-1"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Inflação IPCA</span>
                <span className="text-xs font-mono font-bold text-amber-700">{ipcaRate}% a.a.</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="10" 
                step="0.5"
                value={ipcaRate}
                onChange={(e) => setIpcaRate(Number(e.target.value))}
                className="w-full accent-amber-600 h-1"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Prazo de Acúmulo</span>
              <span className="text-xs font-mono font-bold text-zinc-900">{years} anos</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="35" 
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-emerald-600 h-1"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-800 block">Reinvestir Proventos (Bola de Neve)</span>
              <span className="text-[10px] text-zinc-400">Juros sobre juros exponencial</span>
            </div>
            <button 
              onClick={() => setReinvestDividends(!reinvestDividends)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                reinvestDividends ? 'bg-emerald-600' : 'bg-zinc-200'
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                reinvestDividends ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Right Output & Highlights Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white data-grid-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono block mb-1">
                {viewRealPurchasingPower ? 'Patrimônio Real (IPCA)' : 'Patrimônio Nominal'}
              </span>
              <span className="font-mono text-2xl font-bold text-zinc-900 block">
                R$ {displayedBalance.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-1">
                {viewRealPurchasingPower ? `Descontada inflação de ${ipcaRate}% a.a.` : 'Valor bruto futuro'}
              </span>
            </div>

            <div className="bg-white data-grid-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono block mb-1">
                {viewRealPurchasingPower ? 'Renda Real / Mês' : 'Renda Nominal / Mês'}
              </span>
              <span className="font-mono text-2xl font-bold text-emerald-700 block">
                R$ {displayedMonthlyDiv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 block mt-1">
                Paga mensalmente sem vender ativos
              </span>
            </div>

            <div className="bg-white data-grid-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono block mb-1">
                Total Aportado do Bolso
              </span>
              <span className="font-mono text-2xl font-bold text-zinc-500 block">
                R$ {simulation.totalInvested.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 block mt-1">
                Seu esforço direto de poupança
              </span>
            </div>
          </div>

          {/* Magic Number Card */}
          <div className="bg-gradient-to-br from-amber-50/70 to-white text-zinc-900 p-5 rounded-xl shadow-sm border border-amber-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="font-serif italic text-base">O Número Mágico dos Dividendos ({currentStock?.ticker || "Ativo"})</h4>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-600 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded">
                Efeito Bola de Neve
              </span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              O <strong>Número Mágico</strong> ocorre quando os dividendos mensais pagos por uma ação são suficientes para comprar <strong>1 nova ação todo mês</strong> automaticamente sem tirar dinheiro do seu bolso.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-white p-3 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase text-zinc-400 block">Cotas Necessárias</span>
                <span className="text-base font-bold text-zinc-900">{magicNumberShares} ações</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase text-zinc-400 block">Custo Estimado</span>
                <span className="text-base font-bold text-emerald-600">R$ {magicNumberCost.toFixed(2)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-zinc-200">
                <span className="text-[10px] uppercase text-zinc-400 block">Momento de Atingimento</span>
                <span className="text-base font-bold text-amber-600">
                  {simulation.monthMagicNumberReached 
                    ? `Mês ${simulation.monthMagicNumberReached} (~${Math.ceil(simulation.monthMagicNumberReached / 12)} anos)`
                    : 'Aumente o prazo ou aporte'}
                </span>
              </div>
            </div>
          </div>

          {/* Milestones Target Progress */}
          <div className="bg-white data-grid-border p-5 rounded-xl shadow-sm">
            <h4 className="font-serif italic text-base text-zinc-900 mb-1">
              Marcos de Renda Passiva Mensal (Poder de Compra Real)
            </h4>
            <p className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider mb-4">
              Tempo para atingir metas de renda com base no seu ritmo de aporte
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">1 Salário Mínimo</span>
                <span className="text-sm font-bold text-zinc-900 block mt-0.5">R$ 1.518/mês</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  {simulation.milestoneSalaryMonth ? `${Math.ceil(simulation.milestoneSalaryMonth / 12)}º ano` : 'Em mais anos'}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">R$ 3.000 / mês</span>
                <span className="text-sm font-bold text-zinc-900 block mt-0.5">Básico Sólido</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  {simulation.milestone3kMonth ? `${Math.ceil(simulation.milestone3kMonth / 12)}º ano` : 'Em mais anos'}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">R$ 5.000 / mês</span>
                <span className="text-sm font-bold text-zinc-900 block mt-0.5">Independência</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  {simulation.milestone5kMonth ? `${Math.ceil(simulation.milestone5kMonth / 12)}º ano` : 'Em mais anos'}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">R$ 10.000 / mês</span>
                <span className="text-sm font-bold text-zinc-900 block mt-0.5">Liberdade Plena</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  {simulation.milestone10kMonth ? `${Math.ceil(simulation.milestone10kMonth / 12)}º ano` : 'Em mais anos'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
