import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ShockScenario } from '../types/database';

export function useShockSim() {
  const { user, isDemoMode } = useAuth();
  const [history, setHistory] = useState<ShockScenario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `tejas_shock_${user.id}` : 'tejas_shock_default';

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isSupabaseConfigured() && !isDemoMode) {
      const { data, error } = await supabase
        .from('shock_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistory(data as ShockScenario[]);
        localStorage.setItem(storageKey, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(storageKey);
        if (local) setHistory(JSON.parse(local));
      }
    } else {
      const local = localStorage.getItem(storageKey);
      if (local) {
        setHistory(JSON.parse(local));
      } else {
        setHistory([]);
      }
    }
    setLoading(false);
  }, [user, isDemoMode, storageKey]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveScenario = async (
    scenario: Omit<ShockScenario, 'id' | 'created_at'>
  ): Promise<ShockScenario> => {
    const newSc: ShockScenario = {
      ...scenario,
      id: 'sc-' + crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && !isDemoMode) {
      const { data, error } = await supabase
        .from('shock_scenarios')
        .insert(scenario)
        .select()
        .single();
      if (!error && data) {
        newSc.id = data.id;
      }
    }

    const updated = [newSc, ...history];
    setHistory(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return newSc;
  };

  return {
    history,
    loading,
    saveScenario,
    refreshHistory: loadHistory,
  };
}
