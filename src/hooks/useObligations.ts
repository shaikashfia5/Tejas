import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Obligation } from '../types/database';

export function useObligations() {
  const { user, isDemoMode } = useAuth();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `tejas_obligations_${user.id}` : 'tejas_obligations_default';

  const loadObligations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isSupabaseConfigured() && !isDemoMode) {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (!error && data) {
        setObligations(data as Obligation[]);
        localStorage.setItem(storageKey, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(storageKey);
        if (local) setObligations(JSON.parse(local));
      }
    } else {
      const local = localStorage.getItem(storageKey);
      if (local) {
        setObligations(JSON.parse(local));
      } else {
        setObligations([]);
      }
    }
    setLoading(false);
  }, [user, isDemoMode, storageKey]);

  useEffect(() => {
    loadObligations();
  }, [loadObligations]);

  const addObligation = async (
    obligation: Omit<Obligation, 'id' | 'created_at'>
  ): Promise<Obligation> => {
    const newOb: Obligation = {
      ...obligation,
      id: 'ob-' + crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && !isDemoMode) {
      const { data, error } = await supabase
        .from('obligations')
        .insert(obligation)
        .select()
        .single();
      if (!error && data) {
        newOb.id = data.id;
        newOb.created_at = data.created_at;
      }
    }

    const updated = [...obligations, newOb].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
    setObligations(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return newOb;
  };

  const deleteObligation = async (id: string) => {
    if (isSupabaseConfigured() && !isDemoMode) {
      await supabase.from('obligations').delete().eq('id', id);
    }
    const updated = obligations.filter((o) => o.id !== id);
    setObligations(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return {
    obligations,
    loading,
    addObligation,
    deleteObligation,
    refreshObligations: loadObligations,
  };
}
