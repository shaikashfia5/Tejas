import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { readJson, writeJson } from '../lib/localStore';
import { queueObligation } from '../lib/offlineQueue';
import type { Obligation } from '../types/database';

export function useObligations() {
  const { user, isSupabaseUser } = useAuth();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `tejas_obligations_${user.id}` : 'tejas_obligations_default';
  const useRemote = isSupabaseConfigured() && isSupabaseUser;

  const loadObligations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    if (useRemote) {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (!error && data) {
        setObligations(data as Obligation[]);
        writeJson(storageKey, data);
      } else {
        setObligations(readJson<Obligation[]>(storageKey, []));
      }
    } else {
      setObligations(readJson<Obligation[]>(storageKey, []));
    }
    setLoading(false);
  }, [user, useRemote, storageKey]);

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

    if (!navigator.onLine) {
      await queueObligation(obligation);
    } else if (useRemote) {
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
    writeJson(storageKey, updated);
    return newOb;
  };

  const deleteObligation = async (id: string) => {
    if (useRemote) {
      await supabase.from('obligations').delete().eq('id', id);
    }
    const updated = obligations.filter((o) => o.id !== id);
    setObligations(updated);
    writeJson(storageKey, updated);
  };

  return {
    obligations,
    loading,
    addObligation,
    deleteObligation,
    refreshObligations: loadObligations,
  };
}
