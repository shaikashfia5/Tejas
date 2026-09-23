import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { readJson, writeJson } from '../lib/localStore';
import { queueShock } from '../lib/offlineQueue';
import type { ShockScenario } from '../types/database';

export function useShockSim() {
  const { user, isSupabaseUser } = useAuth();
  const [history, setHistory] = useState<ShockScenario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `tejas_shock_${user.id}` : 'tejas_shock_default';
  const useRemote = isSupabaseConfigured() && isSupabaseUser;

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    if (useRemote) {
      const { data, error } = await supabase
        .from('shock_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistory(data as ShockScenario[]);
        writeJson(storageKey, data);
      } else {
        setHistory(readJson<ShockScenario[]>(storageKey, []));
      }
    } else {
      setHistory(readJson<ShockScenario[]>(storageKey, []));
    }
    setLoading(false);
  }, [user, useRemote, storageKey]);

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

    if (!navigator.onLine) {
      await queueShock(scenario);
    } else if (useRemote) {
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
    writeJson(storageKey, updated);
    return newSc;
  };

  return {
    history,
    loading,
    saveScenario,
    refreshHistory: loadHistory,
  };
}
