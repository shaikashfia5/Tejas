import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { queueEntry, getPendingCount, flushQueue, clearSynced } from '../lib/offlineQueue';
import { readJson, writeJson } from '../lib/localStore';
import type { EvidenceRecord } from '../types/database';

export function useEvidence() {
  const { user, isSupabaseUser } = useAuth();
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const storageKey = user ? `tejas_evidence_${user.id}` : 'tejas_evidence_default';
  const useRemote = isSupabaseConfigured() && isSupabaseUser;

  const loadEvidence = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    if (useRemote) {
      const { data, error } = await supabase
        .from('evidence_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!error && data) {
        setEvidence(data as EvidenceRecord[]);
        writeJson(storageKey, data);
      } else {
        // Offline or query failed — fall back to the local cache.
        setEvidence(readJson<EvidenceRecord[]>(storageKey, []));
      }
    } else {
      setEvidence(readJson<EvidenceRecord[]>(storageKey, []));
    }

    const pending = await getPendingCount();
    setPendingSyncCount(pending);
    setLoading(false);
  }, [user, useRemote, storageKey]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const addEvidence = async (
    record: Omit<EvidenceRecord, 'id' | 'created_at'>
  ): Promise<{ record: EvidenceRecord; error?: string }> => {
    const newRecord: EvidenceRecord = {
      ...record,
      id: 'ev-' + crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (!navigator.onLine || !useRemote) {
      // Offline (or no backend): queue for sync and keep a local copy.
      await queueEntry(record);
      const pending = await getPendingCount();
      setPendingSyncCount(pending);
      setSyncError(null);
    } else {
      const { data, error } = await supabase
        .from('evidence_records')
        .insert(record)
        .select()
        .single();
      if (!error && data) {
        newRecord.id = data.id;
        newRecord.created_at = data.created_at;
        setSyncError(null);
      } else {
        // Server insert failed — queue for retry instead of silently diverging.
        await queueEntry(record);
        const pending = await getPendingCount();
        setPendingSyncCount(pending);
        setSyncError('Saved on this device — will sync automatically.');
      }
    }

    const updated = [newRecord, ...evidence];
    setEvidence(updated);
    writeJson(storageKey, updated);
    return { record: newRecord };
  };

  const deleteEvidence = async (id: string) => {
    if (useRemote) {
      const { error } = await supabase.from('evidence_records').delete().eq('id', id);
      if (error) {
        // Remote delete failed — keep the record so local and server stay in sync.
        setSyncError('Could not delete — please try again.');
        return;
      }
    }
    const updated = evidence.filter((e) => e.id !== id);
    setEvidence(updated);
    writeJson(storageKey, updated);
  };

  const retrySync = async () => {
    if (!useRemote) return;
    const result = await flushQueue();
    await clearSynced();
    const pending = await getPendingCount();
    setPendingSyncCount(pending);
    setSyncError(result.failed > 0 ? 'Some entries still need to sync. Retrying automatically.' : null);
    await loadEvidence();
  };

  return {
    evidence,
    loading,
    pendingSyncCount,
    syncError,
    addEvidence,
    deleteEvidence,
    retrySync,
    refreshEvidence: loadEvidence,
  };
}
