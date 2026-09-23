import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { readJson, writeJson } from '../lib/localStore';
import type { Brief, BriefSnapshot } from '../types/database';

/**
 * Cryptographically strong share token (128 bits of entropy).
 * Share links act as bearer credentials to financial data — Math.random()
 * is not acceptable for this.
 */
function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `tb-${hex}`;
}

export function useBriefs() {
  const { user, isSupabaseUser } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `tejas_briefs_${user.id}` : 'tejas_briefs_default';
  const useRemote = isSupabaseConfigured() && isSupabaseUser;

  const loadBriefs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    if (useRemote) {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (!error && data) {
        setBriefs(data as Brief[]);
        writeJson(storageKey, data);
      } else {
        setBriefs(readJson<Brief[]>(storageKey, []));
      }
    } else {
      setBriefs(readJson<Brief[]>(storageKey, []));
    }
    setLoading(false);
  }, [user, useRemote, storageKey]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const generateBrief = async (
    snapshotData: BriefSnapshot,
    expiryDays: number = 30
  ): Promise<Brief> => {
    const shareToken = generateShareToken();
    const expiryDate = new Date(Date.now() + expiryDays * 86400000).toISOString();

    const newBrief: Brief = {
      id: 'br-' + crypto.randomUUID(),
      user_id: user?.id || 'local-user',
      generated_at: new Date().toISOString(),
      expiry_date: expiryDate,
      revoked: false,
      share_token: shareToken,
      snapshot_data: snapshotData,
    };

    if (useRemote) {
      const { data, error } = await supabase
        .from('briefs')
        .insert({
          user_id: newBrief.user_id,
          expiry_date: newBrief.expiry_date,
          revoked: false,
          share_token: newBrief.share_token,
          snapshot_data: newBrief.snapshot_data,
        })
        .select()
        .single();
      if (!error && data) {
        newBrief.id = data.id;
      }
    }

    const updated = [newBrief, ...briefs];
    setBriefs(updated);
    writeJson(storageKey, updated);

    // Local lookup cache for the public brief page (used when no backend is configured).
    writeJson(`tejas_public_brief_${shareToken}`, newBrief);
    return newBrief;
  };

  const revokeBrief = async (briefId: string) => {
    if (useRemote) {
      const { error } = await supabase.from('briefs').update({ revoked: true }).eq('id', briefId);
      if (error) return; // keep state unchanged if the revoke failed
    }
    const updated = briefs.map((b) => {
      if (b.id === briefId) {
        const rev = { ...b, revoked: true };
        writeJson(`tejas_public_brief_${b.share_token}`, rev);
        return rev;
      }
      return b;
    });
    setBriefs(updated);
    writeJson(storageKey, updated);
  };

  return {
    briefs,
    loading,
    generateBrief,
    revokeBrief,
    refreshBriefs: loadBriefs,
  };
}

export async function fetchPublicBrief(shareToken: string): Promise<{ brief?: Brief; error?: string }> {
  // Remote lookup through the token-gated RPC (public briefs table access is blocked).
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_public_brief', { p_token: shareToken });
      if (!error && data) {
        const res = data as { status: string; brief?: Brief };
        if (res.status === 'ok' && res.brief) {
          return { brief: res.brief };
        }
        return { error: res.status };
      }
      // If the RPC is missing (migration 003 not applied yet) fall through to local cache.
    } catch {
      // fall through
    }
  }

  // Local cache (offline / local-mode shares)
  const local = readJson<Brief | null>(`tejas_public_brief_${shareToken}`, null);
  if (local) {
    if (local.revoked) return { error: 'revoked' };
    if (new Date(local.expiry_date) < new Date()) return { error: 'expired' };
    return { brief: local };
  }

  return { error: 'not_found' };
}
