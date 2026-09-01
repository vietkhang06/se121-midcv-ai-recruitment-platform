'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Industry, UserRole } from '@/types';

interface QuickOnboardingData {
  age?: number;
  targetIndustry?: Industry;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasSeenFirstVisit: boolean;
  firstVisitChoice: 'CANDIDATE' | 'RECRUITER' | 'SKIP' | null;
  quickOnboardingData: QuickOnboardingData | null;
  isAuthModalOpen: boolean;
  authModalMode: 'LOGIN' | 'REGISTER';
  setFirstVisitChoice: (choice: 'CANDIDATE' | 'RECRUITER' | 'SKIP', data?: QuickOnboardingData) => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
  closeAuthModal: () => void;
  loginCandidate: () => void;
  registerCandidate: (data: { fullName: string; email: string; age?: number; targetIndustry?: Industry }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasSeenFirstVisit, setHasSeenFirstVisit] = useState<boolean>(true); // default true for SSR safety
  const [firstVisitChoice, setChoice] = useState<'CANDIDATE' | 'RECRUITER' | 'SKIP' | null>(null);
  const [quickOnboardingData, setQuickOnboardingData] = useState<QuickOnboardingData | null>(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  useEffect(() => {
    // Read local storage on client side mount
    const seen = localStorage.getItem('hasSeenFirstVisitOnboarding');
    if (!seen) {
      setHasSeenFirstVisit(false);
    }

    // Default logged in user for interactive demo
    setUser({
      id: 'usr-cand-01',
      email: 'nguyenvanjava@example.com',
      fullName: 'Nguyen Van Java',
      role: 'CANDIDATE',
      age: 24,
      targetIndustry: 'Technology'
    });
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

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const loginCandidate = () => {
    setUser({
      id: 'usr-cand-01',
      email: 'nguyenvanjava@example.com',
      fullName: 'Nguyen Van Java',
      role: 'CANDIDATE',
      age: 24,
      targetIndustry: 'Technology'
    });
    closeAuthModal();
  };

  const registerCandidate = (data: { fullName: string; email: string; age?: number; targetIndustry?: Industry }) => {
    setUser({
      id: `usr-${Date.now()}`,
      email: data.email,
      fullName: data.fullName,
      role: 'CANDIDATE',
      age: data.age || 22,
      targetIndustry: data.targetIndustry || 'Technology'
    });
    closeAuthModal();
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        hasSeenFirstVisit,
        firstVisitChoice,
        quickOnboardingData,
        isAuthModalOpen,
        authModalMode,
        setFirstVisitChoice,
        openAuthModal,
        closeAuthModal,
        loginCandidate,
        registerCandidate,
        logout
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
