import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Sliders, 
  DollarSign, 
  LogOut, 
  Key, 
  Eye, 
  EyeOff, 
  Award, 
  Check, 
  RefreshCw,
  FolderLock,
  Layers,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Clock,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AddTickerField } from './AddTickerField';
import { RiskProfile, InvestmentStrategy, ExperienceLevel } from '../types';

interface RegistrationFlowProps {
  initialMode?: 'register' | 'login' | 'profile';
  onClose?: () => void;
  onSuccess?: () => void;
}

const POPULAR_B3_WATCHLIST = [
  { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'Bancos', dy: '7.8%', desc: 'Lucro recorrente e P/L abaixo de 8x' },
  { ticker: 'TAEE11', name: 'Taesa Elétrica', sector: 'Energia', dy: '9.2%', desc: 'Receita previsível corrigida pelo IPCA/IGP-M' },
  { ticker: 'EGIE3', name: 'Engie Brasil', sector: 'Energia', dy: '6.9%', desc: 'Geração limpa e histórico de alto payout' },
  { ticker: 'PETR4', name: 'Petrobras PN', sector: 'Petróleo', dy: '11.5%', desc: 'Fluxo de caixa livre robusto e alto yield' },
  { ticker: 'VALE3', name: 'Vale S.A.', sector: 'Mineração', dy: '7.4%', desc: 'Exportadora global com forte geração de caixa' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco', sector: 'Bancos', dy: '6.4%', desc: 'Líder em rentabilidade sobre patrimônio (ROE)' },
  { ticker: 'BBSE3', name: 'BB Seguridade', sector: 'Seguros', dy: '8.5%', desc: 'Modelo asset-light sem risco de crédito bancário' },
  { ticker: 'SAPR11', name: 'Sanepar', sector: 'Saneamento', dy: '7.2%', desc: 'Monopólio natural com forte desconto patrimonial' }
];

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  initialMode = 'register',
  onClose,
  onSuccess
}) => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    register, 
    login, 
    loginDemo, 
    logout, 
    updateProfile, 
    resetPassword,
    registeredUsersCount 
  } = useAuth();

  const [mode, setMode] = useState<'register' | 'login' | 'profile' | 'forgot'>(() => {
    if (isAuthenticated) return 'profile';
    return initialMode;
  });

  // Multi-step Registration State
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Step 2 Profile
  const [strategy, setStrategy] = useState<InvestmentStrategy>('dividendos_bazin');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('conservador');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediario');
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1500);
  const [monthlyDividendGoal, setMonthlyDividendGoal] = useState<number>(3500);
  const [defaultMarginOfSafety, setDefaultMarginOfSafety] = useState<number>(20);
  const [defaultMinYield, setDefaultMinYield] = useState<number>(6.0);

  // Step 3 Watchlist
  const [selectedWatchlist, setSelectedWatchlist] = useState<string[]>(['BBAS3', 'TAEE11', 'PETR4']);
  // Papéis extras incluídos pelo usuário (além dos sugeridos)
  const [customStocks, setCustomStocks] = useState<{ ticker: string; name: string; sector?: string; price?: number }[]>([]);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit profile state (when logged in)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.profile.name || '');
  const [editPhone, setEditPhone] = useState(user?.profile.phone || '');
  const [editMonthlyContribution, setEditMonthlyContribution] = useState(user?.profile.monthlyContribution || 1500);
  const [editMonthlyDividendGoal, setEditMonthlyDividendGoal] = useState(user?.profile.monthlyDividendGoal || 3000);
  const [editStrategy, setEditStrategy] = useState<InvestmentStrategy>(user?.profile.strategy || 'dividendos_bazin');
  const [editMargin, setEditMargin] = useState(user?.profile.defaultMarginOfSafety || 20);

  // Password strength check
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordScore = getPasswordStrength(password);

  const toggleWatchlistTicker = (ticker: string) => {
    setSelectedWatchlist(prev => 
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    );
  };

  // Step validation
  const validateStep1 = () => {
    setErrorMsg(null);
    if (!name.trim() || name.trim().length < 3) {
      setErrorMsg('Por favor, informe seu nome completo (mínimo 3 caracteres).');
      return false;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Por favor, insira um e-mail válido.');
      return false;
    }
    if (password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg('A confirmação da senha não confere com a senha digitada.');
      return false;
    }
    if (!acceptedTerms) {
      setErrorMsg('Você deve aceitar os Termos de Uso e Política de Privacidade.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleCompleteRegistration = async () => {
    setErrorMsg(null);
    const result = await register({
      name,
      email,
      password,
      phone,
      strategy,
      riskProfile,
      experienceLevel,
      monthlyContribution,
      monthlyDividendGoal,
      defaultMarginOfSafety,
      defaultMinYield,
      watchlist: selectedWatchlist,
      watchlistPrices: Object.fromEntries(customStocks.filter(c => c.price).map(c => [c.ticker, c.price as number])),
      acceptedTerms
    });

    if (result.success) {
      setSuccessMsg('Cadastro realizado com sucesso! Bem-vindo ao Terminal Valorize AI.');
      setMode('profile');
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(result.error || 'Não foi possível completar o cadastro.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginEmail) {
      setErrorMsg('Informe o e-mail cadastrado.');
      return;
    }
    const res = await login(loginEmail, loginPassword);
    if (res.success) {
      setSuccessMsg('Login realizado com sucesso!');
      setMode('profile');
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || 'Credenciais inválidas.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMsg('Informe o e-mail cadastrado.');
      return;
    }
    const res = await resetPassword(forgotEmail);
    setForgotFeedback(res.message);
  };

  const handleSaveProfileUpdates = async () => {
    setErrorMsg(null);
    const res = await updateProfile({
      name: editName,
      phone: editPhone,
      monthlyContribution: Number(editMonthlyContribution),
      monthlyDividendGoal: Number(editMonthlyDividendGoal),
      strategy: editStrategy,
      defaultMarginOfSafety: Number(editMargin)
    });

    if (res.success) {
      setIsEditingProfile(false);
      setSuccessMsg('Perfil cadastral atualizado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || 'Erro ao atualizar dados.');
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6 sm:p-8 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  Terminal B3 Institucional
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {registeredUsersCount} investidores registrados
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                {isAuthenticated ? 'Portal do Investidor Cadastrado' : 'Cadastro de Acesso ao Valorize AI'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {isAuthenticated
                  ? 'Gerencie seus dados de investidor, metas de dividendos, margem de segurança e parâmetros de valuation.'
                  : 'Crie seu cadastro gratuito para salvar sua carteira, receber alertas de preço teto de Décio Bazin e Graham, e simular aportes.'}
              </p>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(null); }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                    mode === 'register' 
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Criar Conta
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(null); }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                    mode === 'login' 
                      ? 'bg-zinc-800 text-white shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Entrar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono text-rose-400 hover:bg-rose-950/40 transition-colors"
                title="Desconectar sessão atual"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 sm:p-8">
        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="font-medium">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="font-medium">{successMsg}</div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE: REGISTER (SIGN UP)                            */}
        {/* ---------------------------------------------------- */}
        {mode === 'register' && (
          <div>
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                  step === 1 ? 'bg-zinc-950 text-white' : step > 1 ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">Identificação & Senha</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Dados cadastrais</div>
                </div>
              </div>

              <div className="h-0.5 w-12 bg-zinc-200 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                  step === 2 ? 'bg-zinc-950 text-white' : step > 2 ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {step > 2 ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">Perfil de Investidor</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Bazin vs Graham</div>
                </div>
              </div>

              <div className="h-0.5 w-12 bg-zinc-200 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                  step === 3 ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  3
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">Ativos Iniciais</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Carteira B3</div>
                </div>
              </div>
            </div>

            {/* STEP 1: Personal & Security Info */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all font-sans"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                      E-mail Institucional ou Pessoal *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="investidor@exemplo.com.br"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all font-sans"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                      Telefone / WhatsApp (opcional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400">Usado para receber alertas de preço teto via mensagem</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                      Senha de Acesso *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-9 pr-10 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Visual Meter */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1 h-1.5">
                          <div className={`flex-1 rounded-full ${passwordScore >= 1 ? 'bg-amber-400' : 'bg-zinc-200'}`} />
                          <div className={`flex-1 rounded-full ${passwordScore >= 2 ? 'bg-amber-500' : 'bg-zinc-200'}`} />
                          <div className={`flex-1 rounded-full ${passwordScore >= 3 ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                          <div className={`flex-1 rounded-full ${passwordScore >= 4 ? 'bg-emerald-600' : 'bg-zinc-200'}`} />
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                          <span>Força: {passwordScore <= 1 ? 'Fraca' : passwordScore <= 2 ? 'Razoável' : 'Excelente'}</span>
                          <span>{password.length}/8 caracteres recomendados</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha exatamente"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-zinc-300"
                    />
                    <span className="text-xs text-zinc-600 leading-relaxed">
                      Concordo com os <strong>Termos de Uso</strong> e com o processamento de dados para fins de análise fundamentalista e projeção de proventos, conforme a Lei Geral de Proteção de Dados (LGPD).
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs font-mono font-bold text-zinc-500 hover:text-zinc-900"
                  >
                    Já tenho uma conta cadastrada
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    Avançar para Perfil
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Investor Profile & Valuation Preferences */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider font-mono mb-3">
                    Qual é o seu foco primordial de investimento na B3?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div 
                      onClick={() => { setStrategy('dividendos_bazin'); setDefaultMinYield(6.0); }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        strategy === 'dividendos_bazin' 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Método Décio Bazin
                        </span>
                        {strategy === 'dividendos_bazin' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-sm font-bold text-zinc-900">Renda Passiva & Dividendos</div>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                        Foco no Preço Teto Bazin (Yield &ge; 6%), empresas vacas leiteiras com histórico perene de proventos e baixo endividamento.
                      </p>
                    </div>

                    <div 
                      onClick={() => { setStrategy('valor_graham'); setDefaultMarginOfSafety(25); }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        strategy === 'valor_graham' 
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs' 
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          Benjamin Graham
                        </span>
                        {strategy === 'valor_graham' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="text-sm font-bold text-zinc-900">Valor Intrínseco & Margem</div>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                        Fórmula de Graham &radic;(22.5 &times; LPA &times; VPA) buscando barganhas patrimoniais com alta margem de segurança.
                      </p>
                    </div>

                    <div 
                      onClick={() => setStrategy('misto')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        strategy === 'misto' 
                          ? 'border-purple-500 bg-purple-50/50 shadow-xs' 
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Estratégia Híbrida
                        </span>
                        {strategy === 'misto' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="text-sm font-bold text-zinc-900">Dividendos + Crescimento</div>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                        Equilíbrio entre fluxo contínuo de proventos no curto prazo e valorização patrimonial no longo prazo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                      Tolerância ao Risco
                    </label>
                    <select
                      value={riskProfile}
                      onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}
                      className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans"
                    >
                      <option value="conservador">Conservador (Prioridade total para preservação e dividendos)</option>
                      <option value="moderado">Moderado (Ações sólidas + ligeira busca por upside)</option>
                      <option value="arrojado">Arrojado (Volatilidade tolerada por retorno composto)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                      Experiência no Mercado de Ações
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans"
                    >
                      <option value="iniciante">Iniciante (Primeiros aportes na Bolsa de Valores)</option>
                      <option value="intermediario">Intermediário (Já recebo proventos e conheço balanços)</option>
                      <option value="avancado">Avançado (Carteira consolidada e foco em alocação ótima)</option>
                    </select>
                  </div>
                </div>

                {/* Financial Targets Grid */}
                <div className="bg-zinc-50 p-4 sm:p-5 rounded-xl border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold font-mono uppercase text-zinc-900 tracking-wider">
                      Suas Metas Financeiras Pessoais
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-600 font-medium">Capacidade de Aporte Mensal:</span>
                        <span className="font-mono font-bold text-zinc-900">
                          R$ {monthlyContribution.toLocaleString('pt-BR')},00
                        </span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="20000"
                        step="100"
                        value={monthlyContribution}
                        onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                        className="w-full accent-zinc-950"
                      />
                      <span className="text-[10px] text-zinc-400 font-mono">Usado no Otimizador de Aportes</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-600 font-medium">Meta de Renda Passiva Mensal:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          R$ {monthlyDividendGoal.toLocaleString('pt-BR')},00
                        </span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="50000"
                        step="250"
                        value={monthlyDividendGoal}
                        onChange={(e) => setMonthlyDividendGoal(Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                      <span className="text-[10px] text-zinc-400 font-mono">Usado na barra de progresso da aposentadoria</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Margem de Segurança Padrão (%)
                      </label>
                      <div className="flex items-center gap-2">
                        {[15, 20, 25, 30].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDefaultMarginOfSafety(pct)}
                            className={`flex-1 py-1 text-xs font-mono font-bold rounded-lg border ${
                              defaultMarginOfSafety === pct 
                                ? 'bg-zinc-950 text-white border-zinc-950' 
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Dividend Yield Mínimo de Bazin (%)
                      </label>
                      <div className="flex items-center gap-2">
                        {[5.0, 6.0, 7.0, 8.0].map(yd => (
                          <button
                            key={yd}
                            type="button"
                            onClick={() => setDefaultMinYield(yd)}
                            className={`flex-1 py-1 text-xs font-mono font-bold rounded-lg border ${
                              defaultMinYield === yd 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            {yd.toFixed(1)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-600 hover:text-zinc-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    Avançar para Ativos Iniciais
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Initial Watchlist Selection */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider font-mono">
                      Selecione ações da B3 para iniciar seu acompanhamento:
                    </label>
                    <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedWatchlist.length} ativos selecionados
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-4">
                    Já criaremos posições de amostra com preços médios e histórico para você poder explorar a carteira e o radar no primeiro acesso.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    {POPULAR_B3_WATCHLIST.map(item => {
                      const isSelected = selectedWatchlist.includes(item.ticker);
                      return (
                        <div
                          key={item.ticker}
                          onClick={() => toggleWatchlistTicker(item.ticker)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' 
                              : 'border-zinc-200 hover:border-zinc-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-sm text-zinc-900">{item.ticker}</span>
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-bold">
                                DY {item.dy}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-zinc-800 truncate">{item.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">{item.sector}</div>
                            <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-snug">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-zinc-400">
                              {isSelected ? 'Incluído na carteira' : 'Clique para incluir'}
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              isSelected ? 'bg-emerald-600 text-white' : 'border border-zinc-300'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Papéis extras do usuário */}
                  {customStocks.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">Seus papéis adicionados</div>
                      <div className="flex flex-wrap gap-2">
                        {customStocks.map(c => (
                          <span key={c.ticker} className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border-2 border-emerald-500 bg-emerald-50/40">
                            <span className="font-mono font-bold text-xs text-zinc-900">{c.ticker}</span>
                            <span className="text-[10px] text-zinc-500 max-w-[110px] truncate">{c.name !== c.ticker ? c.name : ''}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomStocks(prev => prev.filter(x => x.ticker !== c.ticker));
                                setSelectedWatchlist(prev => prev.filter(t => t !== c.ticker));
                              }}
                              className="w-6 h-6 rounded-full hover:bg-rose-100 text-zinc-400 hover:text-rose-600 flex items-center justify-center text-sm"
                              aria-label={`Remover ${c.ticker}`}
                            >×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 sm:p-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60">
                    <AddTickerField
                      selected={selectedWatchlist}
                      onAdd={(ticker, info) => {
                        if (!POPULAR_B3_WATCHLIST.some(p => p.ticker === ticker)) {
                          setCustomStocks(prev => [...prev, { ticker, ...info }]);
                        }
                        setSelectedWatchlist(prev => (prev.includes(ticker) ? prev : [...prev, ticker]));
                      }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-950 text-white p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <div className="font-bold text-white">Pronto para ativar seu Terminal</div>
                      <div className="text-zinc-400 text-[11px]">
                        Ao finalizar, você terá acesso irrestrito aos cálculos de Graham, Bazin e IA.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-600 hover:text-zinc-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteRegistration}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Criando Cadastro...
                      </>
                    ) : (
                      <>
                        Concluir Cadastro & Acessar
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE: LOGIN (ENTRAR)                                */}
        {/* ---------------------------------------------------- */}
        {mode === 'login' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                  E-mail Cadastrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-emerald-700 hover:underline font-mono"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                  />
                  <span className="text-zinc-600">Lembrar-me neste dispositivo</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : 'Entrar no Terminal'}
              </button>
            </form>

            {/* Quick Demo Access Buttons */}
            <div className="pt-4 border-t border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest text-center mb-3">
                Ou acesse instantaneamente com perfil demo:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loginDemo('dividendos_bazin');
                    setMode('profile');
                    if (onSuccess) onSuccess();
                  }}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-colors"
                >
                  <div className="text-xs font-bold text-emerald-950">Dr. Roberto (Bazin)</div>
                  <div className="text-[10px] text-emerald-700 font-mono">Foco Renda 6% DY</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    loginDemo('valor_graham');
                    setMode('profile');
                    if (onSuccess) onSuccess();
                  }}
                  className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-colors"
                >
                  <div className="text-xs font-bold text-blue-950">Mariana (Graham)</div>
                  <div className="text-[10px] text-blue-700 font-mono">Deep Value B3</div>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); }}
                className="text-xs text-zinc-600 hover:text-zinc-950 font-medium"
              >
                Não tem uma conta ainda? <span className="font-bold text-emerald-700 underline">Criar cadastro gratuito</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE: FORGOT PASSWORD                               */}
        {/* ---------------------------------------------------- */}
        {mode === 'forgot' && (
          <div className="max-w-md mx-auto space-y-5 animate-in fade-in">
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2 text-zinc-700">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Recuperação de Acesso</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Insira o e-mail cadastrado para receber instruções de recuperação de senha.
              </p>
            </div>

            {forgotFeedback ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  E-mail enviado!
                </div>
                <p className="leading-relaxed">{forgotFeedback}</p>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setForgotFeedback(null); }}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg font-mono font-bold text-xs"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono mb-1.5">
                    Seu E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="investidor@exemplo.com.br"
                    className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="flex-1 py-2.5 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-mono font-bold text-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
                  >
                    Enviar Link
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE: PROFILE (MINHA CONTA CADASTRADA)              */}
        {/* ---------------------------------------------------- */}
        {mode === 'profile' && user && (
          <div className="space-y-6 animate-in fade-in">
            {/* User Profile Card */}
            <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 p-6 rounded-2xl border border-zinc-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-950 text-emerald-400 flex items-center justify-center font-bold text-xl font-mono shadow-md">
                    {user.profile.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-zinc-900">{user.profile.name}</h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Ativo B3
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{user.profile.email}</div>
                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-3">
                      <span>Membro desde: {new Date(user.profile.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>Perfil: <strong className="text-zinc-700 capitalize">{user.profile.riskProfile}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(!isEditingProfile);
                      setEditName(user.profile.name);
                      setEditPhone(user.profile.phone || '');
                      setEditMonthlyContribution(user.profile.monthlyContribution);
                      setEditMonthlyDividendGoal(user.profile.monthlyDividendGoal);
                      setEditStrategy(user.profile.strategy);
                      setEditMargin(user.profile.defaultMarginOfSafety);
                    }}
                    className="px-3.5 py-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 rounded-xl text-xs font-mono font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {isEditingProfile ? 'Cancelar Edição' : 'Editar Parâmetros'}
                  </button>

                  <button
                    type="button"
                    onClick={() => logout()}
                    className="p-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs transition-colors"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editing Form Toggle */}
              {isEditingProfile && (
                <div className="mt-6 pt-6 border-t border-zinc-200 space-y-4 animate-in fade-in">
                  <div className="text-xs font-bold font-mono uppercase text-zinc-900 tracking-wider">
                    Atualização de Dados Cadastrais & Filosofia
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Telefone de Contato</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Aporte Mensal (R$)</label>
                      <input
                        type="number"
                        value={editMonthlyContribution}
                        onChange={(e) => setEditMonthlyContribution(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Meta de Renda Mensal (R$)</label>
                      <input
                        type="number"
                        value={editMonthlyDividendGoal}
                        onChange={(e) => setEditMonthlyDividendGoal(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Margem de Segurança Padrão (%)</label>
                      <input
                        type="number"
                        value={editMargin}
                        onChange={(e) => setEditMargin(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-mono"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfileUpdates}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics & Goals Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                    Filosofia Cadastrada
                  </span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-base font-bold text-zinc-900">
                  {user.profile.strategy === 'dividendos_bazin' 
                    ? 'Décio Bazin (Renda 6%)' 
                    : user.profile.strategy === 'valor_graham' 
                      ? 'Benjamin Graham (Valor)' 
                      : 'Híbrida B3'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Margem de Segurança: <strong className="text-zinc-800">{user.profile.defaultMarginOfSafety}%</strong>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                    Meta de Renda Passiva
                  </span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  R$ {user.profile.monthlyDividendGoal.toLocaleString('pt-BR')},00
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Aporte planejado: <strong className="text-zinc-800">R$ {user.profile.monthlyContribution.toLocaleString('pt-BR')}/mês</strong>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                    Ativos Monitorados
                  </span>
                  <Layers className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-950">
                  {user.portfolio.length} papéis em carteira
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Watchlist: <span className="font-mono">{user.profile.watchlist.slice(0, 4).join(', ')}{user.profile.watchlist.length > 4 ? '...' : ''}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
              <div className="text-zinc-600">
                Sessão segura ativa. Seus dados cadastrais e simulações são sincronizados automaticamente no dispositivo.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `cadastro_valorize_${user.profile.email}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg font-mono text-zinc-700 font-bold"
                >
                  Exportar Cadastro (Backup)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
