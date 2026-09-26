'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Industry, AuthState } from '@/types';
import { loginAccount, registerCandidateAccount, registerRecruiterAccount } from '@/lib/api';

interface QuickOnboardingData {
  age?: number;
  targetIndustry?: Industry;
}

export interface IntendedAction {
  type: 'APPLY' | 'NAVIGATE';
  target?: string;
  data?: any;
}

interface AuthContextType {
  user: User | null;
  authState: AuthState;
  isAuthenticated: boolean;
  hasSeenFirstVisit: boolean;
  firstVisitChoice: 'CANDIDATE' | 'RECRUITER' | 'SKIP' | null;
  quickOnboardingData: QuickOnboardingData | null;
  isAuthModalOpen: boolean;
  authModalMode: 'LOGIN' | 'REGISTER';
  intendedAction: IntendedAction | null;
  setFirstVisitChoice: (choice: 'CANDIDATE' | 'RECRUITER' | 'SKIP', data?: QuickOnboardingData) => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER', intended?: IntendedAction) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearIntendedAction: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [hasSeenFirstVisit, setHasSeenFirstVisit] = useState<boolean>(true); // default true for SSR safety
  const [firstVisitChoice, setChoice] = useState<'CANDIDATE' | 'RECRUITER' | 'SKIP' | null>(null);
  const [quickOnboardingData, setQuickOnboardingData] = useState<QuickOnboardingData | null>(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [intendedAction, setIntendedAction] = useState<IntendedAction | null>(null);

  useEffect(() => {
    // 1. Check first visit state
    const seen = localStorage.getItem('hasSeenFirstVisitOnboarding');
    if (!seen) {
      setHasSeenFirstVisit(false);
    }

    // 2. Restore explicit user session if and only if valid session exists
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setAuthState('AUTHENTICATED');
      } catch {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        setUser(null);
        setAuthState('ANONYMOUS');
      }
    } else {
      // Clean default state is strictly ANONYMOUS
      setUser(null);
      setAuthState('ANONYMOUS');
    }
  }, []);

  const setFirstVisitChoice = (choice: 'CANDIDATE' | 'RECRUITER' | 'SKIP', data?: QuickOnboardingData) => {
    setChoice(choice);
    if (data) {
      setQuickOnboardingData(data);
    }
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    setHasSeenFirstVisit(true);

    if (choice === 'CANDIDATE') {
      openAuthModal('REGISTER');
    }
  };

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN', intended?: IntendedAction) => {
    setAuthModalMode(mode);
    if (intended) {
      setIntendedAction(intended);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const clearIntendedAction = () => {
    setIntendedAction(null);
  };

  const login = async (email: string, password: string) => {
    const result = await loginAccount(email, password);
    setUser(result.user);
    setAuthState('AUTHENTICATED');
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    localStorage.setItem('auth_token', result.accessToken);
    closeAuthModal();

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;

      // 1. If an intended navigation target was specified, check role compatibility
      if (intendedAction?.type === 'NAVIGATE' && intendedAction.target) {
        const target = intendedAction.target;
        setIntendedAction(null);

        if (result.user.role === 'ADMIN') {
          window.location.href = target.startsWith('/admin') ? target : '/admin';
          return;
        }
        if (result.user.role === 'RECRUITER') {
          window.location.href = (target.startsWith('/candidate') || target.startsWith('/admin')) ? '/recruiter' : target;
          return;
        }
        if (result.user.role === 'CANDIDATE') {
          window.location.href = (target.startsWith('/recruiter') || target.startsWith('/admin')) ? '/candidate/profile' : target;
          return;
        }
        window.location.href = target;
        return;
      }

      // 2. Default landing page redirection by role
      if (result.user.role === 'ADMIN') {
        window.location.href = '/admin';
      } else if (result.user.role === 'RECRUITER') {
        window.location.href = '/recruiter';
      } else {
        // If candidate logged in from an HR route, Admin route or auth route, redirect to candidate portal
        if (currentPath.startsWith('/recruiter') || currentPath.startsWith('/admin') || currentPath === '/login' || currentPath === '/register') {
          window.location.href = '/candidate/profile';
        }
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_session');
    setUser(null);
    setAuthState('ANONYMOUS');

    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authState,
        isAuthenticated: !!user,
        hasSeenFirstVisit,
        firstVisitChoice,
        quickOnboardingData,
        isAuthModalOpen,
        authModalMode,
        intendedAction,
        setFirstVisitChoice,
        openAuthModal,
        closeAuthModal,
        login,
        logout,
        clearIntendedAction
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
