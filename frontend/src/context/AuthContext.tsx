'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, Industry } from '@/types';
import { MOCK_CANDIDATE } from '@/lib/api';

interface QuickOnboardingData {
  age?: number;
  targetIndustry?: Industry;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  userRole: Role | null;
  hasSeenFirstVisit: boolean;
  quickOnboardingData: QuickOnboardingData | null;
  isAuthModalOpen: boolean;
  authModalMode: 'LOGIN' | 'REGISTER';
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
  closeAuthModal: () => void;
  loginCandidate: () => void;
  registerCandidate: (data: { fullName: string; email: string; age?: number; targetIndustry?: Industry }) => void;
  logout: () => void;
  setFirstVisitChoice: (choice: 'CANDIDATE' | 'RECRUITER' | 'SKIP', onboardingData?: QuickOnboardingData) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasSeenFirstVisit, setHasSeenFirstVisit] = useState<boolean>(true); // Default true until mounted
  const [quickOnboardingData, setQuickOnboardingData] = useState<QuickOnboardingData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  useEffect(() => {
    // Check localStorage for First Visit state and saved Auth User
    const firstVisitState = localStorage.getItem('hasSeenFirstVisitOnboarding');
    if (!firstVisitState) {
      setHasSeenFirstVisit(false);
    }
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user');
      }
    }
  }, []);

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const loginCandidate = () => {
    const candidateUser: User = {
      id: MOCK_CANDIDATE.id,
      fullName: MOCK_CANDIDATE.fullName,
      email: MOCK_CANDIDATE.email,
      role: 'CANDIDATE',
      age: MOCK_CANDIDATE.age,
      targetIndustry: MOCK_CANDIDATE.primaryIndustry
    };
    setUser(candidateUser);
    localStorage.setItem('auth_user', JSON.stringify(candidateUser));
    setIsAuthModalOpen(false);
  };

  const registerCandidate = (data: { fullName: string; email: string; age?: number; targetIndustry?: Industry }) => {
    const newUser: User = {
      id: `cand-${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      role: 'CANDIDATE',
      age: data.age || quickOnboardingData?.age,
      targetIndustry: data.targetIndustry || quickOnboardingData?.targetIndustry || 'Technology'
    };
    setUser(newUser);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const setFirstVisitChoice = (choice: 'CANDIDATE' | 'RECRUITER' | 'SKIP', onboardingData?: QuickOnboardingData) => {
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');
    setHasSeenFirstVisit(true);

    if (choice === 'CANDIDATE' && onboardingData) {
      setQuickOnboardingData(onboardingData);
      openAuthModal('REGISTER');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        userRole: user ? user.role : null,
        hasSeenFirstVisit,
        quickOnboardingData,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        loginCandidate,
        registerCandidate,
        logout,
        setFirstVisitChoice
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
