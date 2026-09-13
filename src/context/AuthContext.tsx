import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_PROFILES } from '../lib/demoData';
import type { Profile } from '../types/database';

interface UserSession {
  id: string;
  email: string;
}

interface AuthContextType {
  user: UserSession | null;
  profile: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  login: (email: string, password?: string) => Promise<{ error?: string }>;
  loginAsDemo: (profileKey: 'lakshmi' | 'raju' | 'priya') => void;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = 'tejas_auth_user';
const STORAGE_KEY_PROFILE = 'tejas_auth_profile';
const STORAGE_KEY_IS_DEMO = 'tejas_is_demo';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    return saved ? JSON.parse(saved) : null;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_IS_DEMO) === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Load profile from Supabase or storage
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          setIsDemoMode(false);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) {
            setProfile(data as Profile);
          }
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const loginAsDemo = (profileKey: 'lakshmi' | 'raju' | 'priya') => {
    const demo = DEMO_PROFILES[profileKey];
    if (!demo) return;
    const demoUser: UserSession = {
      id: demo.profile.id,
      email: `${profileKey}@tejas.app`,
    };
    setUser(demoUser);
    setProfile(demo.profile);
    setIsDemoMode(true);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demoUser));
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(demo.profile));
    localStorage.setItem(STORAGE_KEY_IS_DEMO, 'true');
    // Store demo data locally if not present
    if (!localStorage.getItem(`tejas_evidence_${demo.profile.id}`)) {
      localStorage.setItem(`tejas_evidence_${demo.profile.id}`, JSON.stringify(demo.evidence));
      localStorage.setItem(`tejas_obligations_${demo.profile.id}`, JSON.stringify(demo.obligations));
      localStorage.setItem(`tejas_shock_${demo.profile.id}`, JSON.stringify(demo.shockScenarios));
      localStorage.setItem(`tejas_briefs_${demo.profile.id}`, JSON.stringify(demo.briefs));
    }
  };

  const login = async (email: string, password?: string): Promise<{ error?: string }> => {
    // Check if demo email
    if (email.includes('lakshmi')) {
      loginAsDemo('lakshmi');
      return {};
    }
    if (email.includes('raju')) {
      loginAsDemo('raju');
      return {};
    }
    if (email.includes('priya') || email.includes('demo')) {
      loginAsDemo('priya');
      return {};
    }

    if (isSupabaseConfigured() && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          const userObj = { id: data.user.id, email: data.user.email || '' };
          setUser(userObj);
          setIsDemoMode(false);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
          localStorage.setItem(STORAGE_KEY_IS_DEMO, 'false');
          const { data: profData } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (profData) {
            setProfile(profData);
            localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profData));
          }
        }
        return {};
      } catch (err: any) {
        return { error: err.message || 'Login failed' };
      }
    }

    // Fallback offline / local login
    const localUser: UserSession = { id: 'local-user-' + btoa(email).slice(0, 8), email };
    const localProfile: Profile = {
      id: localUser.id,
      full_name: email.split('@')[0],
      language: 'en',
      income_type: 'seasonal',
      goal: 'crop_input',
      onboarded: false,
      created_at: new Date().toISOString(),
    };
    setUser(localUser);
    setProfile(localProfile);
    setIsDemoMode(true);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(localUser));
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(localProfile));
    localStorage.setItem(STORAGE_KEY_IS_DEMO, 'true');
    return {};
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) return { error: error.message };
        if (data.user) {
          const userObj = { id: data.user.id, email: data.user.email || '' };
          setUser(userObj);
          setIsDemoMode(false);
          const newProfile: Profile = {
            id: data.user.id,
            full_name: fullName,
            language: 'en',
            income_type: 'seasonal',
            goal: 'crop_input',
            onboarded: false,
            created_at: new Date().toISOString(),
          };
          setProfile(newProfile);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
          localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
          localStorage.setItem(STORAGE_KEY_IS_DEMO, 'false');
        }
        return {};
      } catch (err: any) {
        return { error: err.message || 'Sign up failed' };
      }
    }

    // Local / Offline fallback signup
    const localUser: UserSession = { id: 'user-' + Date.now(), email };
    const newProf: Profile = {
      id: localUser.id,
      full_name: fullName || email.split('@')[0],
      language: 'en',
      income_type: 'seasonal',
      goal: 'crop_input',
      onboarded: false,
      created_at: new Date().toISOString(),
    };
    setUser(localUser);
    setProfile(newProf);
    setIsDemoMode(true);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(localUser));
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProf));
    localStorage.setItem(STORAGE_KEY_IS_DEMO, 'true');
    return {};
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
    // Clear per-user cached data to prevent persona leak on shared device
    if (user) {
      ['tejas_evidence_', 'tejas_obligations_', 'tejas_briefs_', 'tejas_shock_'].forEach((prefix) => {
        localStorage.removeItem(prefix + user.id);
      });
    }
    // Also clear any public brief caches
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('tejas_public_brief_')) localStorage.removeItem(k);
    });
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    localStorage.removeItem(STORAGE_KEY_IS_DEMO);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));

    if (isSupabaseConfigured() && !isDemoMode) {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isDemoMode,
        login,
        loginAsDemo,
        signUp,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
