'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { destinationForRole, normalizeRole, portalHome, clearProfileLink } from '@/lib/navigationIntent';
import { User, Industry, AuthState } from '@/types';
import { loginAccount, ensureAuthToken, saveAuthTokens, clearAuthSession, apiRequest, fetchAccountIdentity } from '@/lib/api';

interface QuickOnboardingData {
  age?: number;
  targetIndustry?: Industry;
}

export interface IntendedAction {
  type: 'APPLY' | 'NAVIGATE';
  target?: string;
  data?: unknown;
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
  updateAccountIdentity: (changes: Pick<Partial<User>, 'avatarId' | 'fullName'>) => void;
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
  const sessionGeneration = useRef(0);

  useEffect(() => {
    // 1. Mark first visit as seen so user always sees the public home page on initial visit
    localStorage.setItem('hasSeenFirstVisitOnboarding', 'true');

    let active = true;
    const generation = sessionGeneration.current;
    void ensureAuthToken().then(token => {
      if (!active || generation !== sessionGeneration.current) return;
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser && token) {
        try { const parsed = JSON.parse(storedUser); const role = normalizeRole(parsed?.role); if (!role || !parsed.id) throw new Error('Invalid stored identity'); setUser({ ...parsed, role }); setAuthState('AUTHENTICATED'); return; }
        catch { clearAuthSession(); }
      }
      setUser(null); setAuthState('ANONYMOUS');
    }).catch(() => { if (active && generation === sessionGeneration.current) { setUser(null); setAuthState('ANONYMOUS'); } });

    // 3. Listen for session expired events
    const handleSessionExpired = () => {
      sessionGeneration.current += 1;
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      setUser(null);
      setAuthState('ANONYMOUS');
    };
    const handleSessionStorage = (event: StorageEvent) => {
      if (event.key === 'auth_user' || event.key === null) window.location.reload();
    };
    window.addEventListener('storage', handleSessionStorage);
    window.addEventListener('midcv:session_expired', handleSessionExpired);
    return () => { active = false; window.removeEventListener('storage', handleSessionStorage); window.removeEventListener('midcv:session_expired', handleSessionExpired); };
  }, []);

  const userId = user?.id;
  const identityRevision = useRef(0);
  useEffect(() => {
    if (!userId) return;
    const request = new AbortController();
    const refresh = () => {
      const revision = ++identityRevision.current;
      void fetchAccountIdentity(request.signal).then(identity => {
        if (!request.signal.aborted && revision === identityRevision.current) {
          setUser(current => current?.id === userId ? { ...current, ...identity } : current);
        }
      }).catch(() => {});
    };
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'midcv:avatar-changed' && event.newValue?.startsWith(`${userId}:`)) refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      request.abort();
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId]);

  const updateAccountIdentity: AuthContextType['updateAccountIdentity'] = changes => {
    if (!userId) return;
    identityRevision.current++;
    setUser(current => current?.id === userId ? { ...current, ...changes } : current);
    if ('avatarId' in changes) {
      localStorage.setItem('midcv:avatar-changed', `${userId}:${changes.avatarId ?? 'removed'}`);
    }
  };

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
    setIntendedAction(intended ?? null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setIntendedAction(null);
  };

  const clearIntendedAction = () => {
    setIntendedAction(null);
  };

  const login = async (email: string, password: string) => {
    const result = await loginAccount(email, password);
    sessionGeneration.current += 1;
    setUser(result.user);
    setAuthState('AUTHENTICATED');
    saveAuthTokens(result);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    closeAuthModal();

    const current = `${window.location.pathname}${window.location.search}`;
    const role = result.user.role;
    const requested = intendedAction?.target ?? current;
    const destination = intendedAction?.target || role === 'CANDIDATE'
      ? destinationForRole(role, requested) : portalHome(role);
    if (destination !== current) window.location.replace(destination);
  };

  const logout = async () => {
    sessionGeneration.current += 1;
    try { if (getAuthTokenForLogout()) await apiRequest('/api/v1/auth/logout', { method: 'POST' }); }
    finally {
      clearProfileLink(); clearAuthSession(); setUser(null); setAuthState('ANONYMOUS');
      window.location.href = '/';
    }
  };
  function getAuthTokenForLogout() { return localStorage.getItem('auth_token'); }

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
        clearIntendedAction,
        updateAccountIdentity
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
