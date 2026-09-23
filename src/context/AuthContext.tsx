import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { readJson, writeJson, removeKey } from '../lib/localStore';
import type { Profile } from '../types/database';

interface UserSession {
  id: string;
  email: string;
}

interface AuthContextType {
  user: UserSession | null;
  profile: Profile | null;
  loading: boolean;
  isSupabaseUser: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = 'tejas_auth_user';
const STORAGE_KEY_PROFILE = 'tejas_auth_profile';
const STORAGE_KEY_SOURCE = 'tejas_auth_source';

/**
 * Per-user data keys. Every cached payload is namespaced by user id so
 * switching accounts on a shared device can never leak another user's data.
 */
export function clearUserData(userId: string | null | undefined) {
  if (!userId) return;
  ['tejas_evidence_', 'tejas_obligations_', 'tejas_briefs_', 'tejas_shock_'].forEach((prefix) => {
    removeKey(prefix + userId);
  });
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith('tejas_public_brief_')) removeKey(k);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() =>
    readJson<UserSession | null>(STORAGE_KEY_USER, null)
  );
  const [profile, setProfile] = useState<Profile | null>(() =>
    readJson<Profile | null>(STORAGE_KEY_PROFILE, null)
  );
  const [isSupabaseUser, setIsSupabaseUser] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY_SOURCE) === 'supabase'
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Restore / verify the session on boot.
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured()) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const sessionUser = { id: session.user.id, email: session.user.email || '' };
          setUser(sessionUser);
          setIsSupabaseUser(true);
          writeJson(STORAGE_KEY_USER, sessionUser);
          localStorage.setItem(STORAGE_KEY_SOURCE, 'supabase');
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) {
            setProfile(data as Profile);
            writeJson(STORAGE_KEY_PROFILE, data);
          }
        } else if (localStorage.getItem(STORAGE_KEY_SOURCE) === 'supabase') {
          // Stale cached Supabase session — clear it so the login screen shows.
          clearUserData(user?.id);
          setUser(null);
          setProfile(null);
          setIsSupabaseUser(false);
          removeKey(STORAGE_KEY_USER);
          removeKey(STORAGE_KEY_PROFILE);
          removeKey(STORAGE_KEY_SOURCE);
        }
      }
      setLoading(false);
    }
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = (u: UserSession, p: Profile, source: 'supabase' | 'local') => {
    setUser(u);
    setProfile(p);
    setIsSupabaseUser(source === 'supabase');
    writeJson(STORAGE_KEY_USER, u);
    writeJson(STORAGE_KEY_PROFILE, p);
    localStorage.setItem(STORAGE_KEY_SOURCE, source);
  };

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          const u = { id: data.user.id, email: data.user.email || '' };
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          const p: Profile =
            (profData as Profile) ||
            {
              id: u.id,
              full_name: u.email.split('@')[0],
              language: 'en',
              income_type: 'seasonal',
              goal: 'crop_input',
              onboarded: false,
              created_at: new Date().toISOString(),
            };
          persistSession(u, p, 'supabase');
        }
        return {};
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Login failed' };
      }
    }

    // Local-only fallback when Supabase is not configured.
    // NOTE: this is a device-local convenience profile, NOT authenticated —
    // data never leaves the device.
    const localUser: UserSession = {
      id: 'local-' + email.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 16),
      email,
    };
    const localProfile: Profile = {
      id: localUser.id,
      full_name: email.split('@')[0],
      language: 'en',
      income_type: 'seasonal',
      goal: 'crop_input',
      onboarded: false,
      created_at: new Date().toISOString(),
    };
    persistSession(localUser, localProfile, 'local');
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
        if (data.user && data.session) {
          const u = { id: data.user.id, email: data.user.email || '' };
          const newProfile: Profile = {
            id: data.user.id,
            full_name: fullName || email.split('@')[0],
            language: 'en',
            income_type: 'seasonal',
            goal: 'crop_input',
            onboarded: false,
            created_at: new Date().toISOString(),
          };
          // The on_auth_user_created trigger also creates the profile row;
          // upsert here so the row exists even if the trigger is missing.
          await supabase.from('profiles').upsert(newProfile);
          persistSession(u, newProfile, 'supabase');
          return {};
        }
        if (data.user) {
          // Email confirmation is required before a session is issued.
          return { error: 'Account created. Check your email to confirm, then log in.' };
        }
        return { error: 'Sign up failed. Please try again.' };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Sign up failed' };
      }
    }

    // Local-only fallback.
    const localUser: UserSession = { id: 'local-' + Date.now().toString(36), email };
    const newProfile: Profile = {
      id: localUser.id,
      full_name: fullName || email.split('@')[0],
      language: 'en',
      income_type: 'seasonal',
      goal: 'crop_input',
      onboarded: false,
      created_at: new Date().toISOString(),
    };
    persistSession(localUser, newProfile, 'local');
    return {};
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
    // Clear per-user cached data to prevent account leak on shared devices.
    clearUserData(user?.id);
    setUser(null);
    setProfile(null);
    setIsSupabaseUser(false);
    removeKey(STORAGE_KEY_USER);
    removeKey(STORAGE_KEY_PROFILE);
    removeKey(STORAGE_KEY_SOURCE);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    writeJson(STORAGE_KEY_PROFILE, updated);

    if (isSupabaseConfigured() && isSupabaseUser) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) console.warn('Profile update failed:', error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isSupabaseUser,
        login,
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
