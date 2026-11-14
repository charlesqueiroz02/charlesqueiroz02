import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserProfile, PortfolioItem, RiskProfile, InvestmentStrategy, ExperienceLevel } from '../types';

interface RegisterInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  riskProfile: RiskProfile;
  strategy: InvestmentStrategy;
  experienceLevel: ExperienceLevel;
  monthlyContribution: number;
  monthlyDividendGoal: number;
  defaultMarginOfSafety: number;
  defaultMinYield: number;
  watchlist: string[];
  watchlistPrices?: Record<string, number>; // cotação real dos papéis adicionados pelo usuário
  acceptedTerms: boolean;
}

interface AuthContextType {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  registeredUsersCount: number;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginDemo: (strategy?: 'dividendos_bazin' | 'valor_graham') => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  syncPortfolio: (portfolio: PortfolioItem[]) => void;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const STORAGE_USERS_KEY = 'valorize_users_database';
const STORAGE_SESSION_KEY = 'valorize_active_user_id';

const DEFAULT_DEMO_USERS: UserAccount[] = [
  {
    id: 'usr_demo_bazin',
    portfolio: [
      { ticker: 'BBAS3', purchasePrice: 21.50, quantity: 200, addedAt: Date.now() - 45 * 86400000 },
      { ticker: 'TAEE11', purchasePrice: 35.10, quantity: 120, addedAt: Date.now() - 60 * 86400000 },
      { ticker: 'EGIE3', purchasePrice: 39.80, quantity: 90, addedAt: Date.now() - 75 * 86400000 },
      { ticker: 'PETR4', purchasePrice: 38.50, quantity: 150, addedAt: Date.now() - 90 * 86400000 },
      { ticker: 'ITUB4', purchasePrice: 31.20, quantity: 100, addedAt: Date.now() - 110 * 86400000 },
      { ticker: 'BBSE3', purchasePrice: 34.00, quantity: 110, addedAt: Date.now() - 120 * 86400000 }
    ],
    passwordHash: 'demo123',
    profile: {
      name: 'Dr. Roberto Barsi da Silva',
      email: 'roberto.invest@valorize.com',
      phone: '(11) 98765-4321',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      riskProfile: 'conservador',
      strategy: 'dividendos_bazin',
      experienceLevel: 'avancado',
      monthlyContribution: 2500,
      monthlyDividendGoal: 4000,
      defaultMarginOfSafety: 20,
      defaultMinYield: 6.0,
      watchlist: ['BBAS3', 'TAEE11', 'EGIE3', 'PETR4', 'ITUB4', 'BBSE3', 'SANB11', 'SAPR11'],
      acceptedTerms: true,
      createdAt: Date.now() - 180 * 86400000,
      lastLogin: Date.now()
    }
  },
  {
    id: 'usr_demo_graham',
    portfolio: [
      { ticker: 'VALE3', purchasePrice: 56.40, quantity: 80, addedAt: Date.now() - 30 * 86400000 },
      { ticker: 'BBAS3', purchasePrice: 22.00, quantity: 100, addedAt: Date.now() - 40 * 86400000 },
      { ticker: 'CSNA3', purchasePrice: 11.20, quantity: 200, addedAt: Date.now() - 50 * 86400000 }
    ],
    passwordHash: 'demo123',
    profile: {
      name: 'Mariana Duarte',
      email: 'mariana.valor@valorize.com',
      phone: '(21) 99123-8899',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      riskProfile: 'moderado',
      strategy: 'valor_graham',
      experienceLevel: 'intermediario',
      monthlyContribution: 1800,
      monthlyDividendGoal: 2500,
      defaultMarginOfSafety: 25,
      defaultMinYield: 6.0,
      watchlist: ['VALE3', 'BBAS3', 'PETR4', 'USIM5', 'GGBR4'],
      acceptedTerms: true,
      createdAt: Date.now() - 90 * 86400000,
      lastLogin: Date.now()
    }
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading stored users:', e);
    }
    return DEFAULT_DEMO_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_SESSION_KEY) || null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync users list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to storage:', e);
    }
  }, [users]);

  // Sync active user id to localStorage
  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem(STORAGE_SESSION_KEY, currentUserId);
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (e) {
      console.error('Error saving session to storage:', e);
    }
  }, [currentUserId]);

  const currentUser = users.find(u => u.id === currentUserId) || null;

  const register = async (input: RegisterInput): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Simulate network latency for authentic feel
      await new Promise(r => setTimeout(r, 450));

      const cleanEmail = input.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
      }

      if (!input.name || input.name.trim().length < 3) {
        return { success: false, error: 'O nome completo deve conter no mínimo 3 caracteres.' };
      }

      const existingUser = users.find(u => u.profile.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return { success: false, error: 'Já existe um cadastro com este e-mail. Faça login ou use outro e-mail.' };
      }

      const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Build initial portfolio from selected watchlist if provided
      const initialPortfolio: PortfolioItem[] = input.watchlist.map((ticker, index) => {
        const defaultQuantities: Record<string, number> = {
          'BBAS3': 100,
          'TAEE11': 80,
          'PETR4': 60,
          'VALE3': 50,
          'EGIE3': 70,
          'ITUB4': 90
        };
        const defaultPrices: Record<string, number> = {
          'BBAS3': 21.80,
          'TAEE11': 35.20,
          'PETR4': 39.10,
          'VALE3': 57.30,
          'EGIE3': 40.50,
          'ITUB4': 32.40
        };

        return {
          ticker,
          purchasePrice: input.watchlistPrices?.[ticker] || defaultPrices[ticker] || 25.0,
          quantity: defaultQuantities[ticker] || 50,
          addedAt: Date.now() - (index * 86400000 * 5)
        };
      });

      const newUser: UserAccount = {
        id: newId,
        passwordHash: input.password || 'senha123',
        portfolio: initialPortfolio,
        profile: {
          name: input.name.trim(),
          email: cleanEmail,
          phone: input.phone?.trim() || '',
          riskProfile: input.riskProfile,
          strategy: input.strategy,
          experienceLevel: input.experienceLevel,
          monthlyContribution: input.monthlyContribution || 1000,
          monthlyDividendGoal: input.monthlyDividendGoal || 3000,
          defaultMarginOfSafety: input.defaultMarginOfSafety || 20,
          defaultMinYield: input.defaultMinYield || 6.0,
          watchlist: input.watchlist.length > 0 ? input.watchlist : ['BBAS3', 'TAEE11', 'PETR4'],
          acceptedTerms: input.acceptedTerms,
          createdAt: Date.now(),
          lastLogin: Date.now()
        }
      };

      setUsers(prev => [newUser, ...prev]);
      setCurrentUserId(newId);

      // Also sync current portfolio to localStorage so App.tsx picks it up immediately
      localStorage.setItem('valorize_portfolio', JSON.stringify(initialPortfolio));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao registrar novo investidor.' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const cleanEmail = email.trim().toLowerCase();
      
      const found = users.find(u => u.profile.email.toLowerCase() === cleanEmail);
      if (!found) {
        return { 
          success: false, 
          error: 'E-mail não encontrado em nossa base. Verifique a digitação ou crie seu cadastro.' 
        };
      }

      if (password && found.passwordHash && found.passwordHash !== password) {
        return {
          success: false,
          error: 'Senha incorreta. Tente novamente ou use a recuperação de senha.'
        };
      }

      // Update last login
      const updatedUser: UserAccount = {
        ...found,
        profile: {
          ...found.profile,
          lastLogin: Date.now()
        }
      };

      setUsers(prev => prev.map(u => u.id === found.id ? updatedUser : u));
      setCurrentUserId(found.id);

      // Sync active portfolio into local storage for the dashboard
      if (found.portfolio && found.portfolio.length > 0) {
        localStorage.setItem('valorize_portfolio', JSON.stringify(found.portfolio));
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao realizar login.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = (strategy: 'dividendos_bazin' | 'valor_graham' = 'dividendos_bazin') => {
    const target = users.find(u => u.profile.strategy === strategy) || users[0] || DEFAULT_DEMO_USERS[0];
    if (target) {
      setCurrentUserId(target.id);
      if (target.portfolio) {
        localStorage.setItem('valorize_portfolio', JSON.stringify(target.portfolio));
      }
    }
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUserId) return { success: false, error: 'Nenhum usuário conectado.' };
    
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      setUsers(prev => prev.map(u => {
        if (u.id === currentUserId) {
          return {
            ...u,
            profile: {
              ...u.profile,
              ...updates
            }
          };
        }
        return u;
      }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao atualizar perfil.' };
    } finally {
      setIsLoading(false);
    }
  };

  const syncPortfolio = (newPortfolio: PortfolioItem[]) => {
    if (!currentUserId) return;
    setUsers(prev => prev.map(u => {
      if (u.id === currentUserId) {
        return {
          ...u,
          portfolio: newPortfolio
        };
      }
      return u;
    }));
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    await new Promise(r => setTimeout(r, 600));
    const cleanEmail = email.trim().toLowerCase();
    const found = users.find(u => u.profile.email.toLowerCase() === cleanEmail);
    if (!found) {
      return {
        success: false,
        message: 'E-mail não localizado no sistema. Cadastre-se gratuitamente.'
      };
    }
    return {
      success: true,
      message: `Enviamos as instruções e o código de redefinição de acesso para ${cleanEmail}. Verifique sua caixa de entrada.`
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        registeredUsersCount: users.length,
        register,
        login,
        loginDemo,
        logout,
        updateProfile,
        syncPortfolio,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
