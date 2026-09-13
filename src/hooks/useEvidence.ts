import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { queueEntry, getPendingCount } from '../lib/offlineQueue';
import type { EvidenceRecord } from '../types/database';

export function useEvidence() {
  const { user, isDemoMode } = useAuth();
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const storageKey = user ? `tejas_evidence_${user.id}` : 'tejas_evidence_default';

  const loadEvidence = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isSupabaseConfigured() && !isDemoMode) {
      const { data, error } = await supabase
        .from('evidence_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!error && data) {
        setEvidence(data as EvidenceRecord[]);
        localStorage.setItem(storageKey, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(storageKey);
        if (local) setEvidence(JSON.parse(local));
      }
    } else {
      const local = localStorage.getItem(storageKey);
      if (local) {
        setEvidence(JSON.parse(local));
      } else {
        setEvidence([]);
      }
    }

    const pending = await getPendingCount();
    setPendingSyncCount(pending);
    setLoading(false);
  }, [user, isDemoMode, storageKey]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const addEvidence = async (
    record: Omit<EvidenceRecord, 'id' | 'created_at'>
  ): Promise<EvidenceRecord> => {
    const newRecord: EvidenceRecord = {
      ...record,
      id: 'ev-' + crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await queueEntry(record);
      const pending = await getPendingCount();
      setPendingSyncCount(pending);
    } else if (isSupabaseConfigured() && !isDemoMode) {
      try {
        const { data, error } = await supabase
          .from('evidence_records')
          .insert(record)
          .select()
          .single();
        if (!error && data) {
          newRecord.id = data.id;
          newRecord.created_at = data.created_at;
        }
      } catch (e) {
        await queueEntry(record);
      }
    }

    const updated = [newRecord, ...evidence];
    setEvidence(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return newRecord;
  };

  const deleteEvidence = async (id: string) => {
    if (isSupabaseConfigured() && !isDemoMode) {
      await supabase.from('evidence_records').delete().eq('id', id);
    }
    const updated = evidence.filter((e) => e.id !== id);
    setEvidence(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return {
    evidence,
    loading,
    pendingSyncCount,
    addEvidence,
    deleteEvidence,
    refreshEvidence: loadEvidence,
  };
}
