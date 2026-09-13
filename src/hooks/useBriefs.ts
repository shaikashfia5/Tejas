import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Brief, BriefSnapshot } from '../types/database';

export function useBriefs() {
  const { user, isDemoMode } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const storageKey = user ? `tejas_briefs_${user.id}` : 'tejas_briefs_default';

  const loadBriefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isSupabaseConfigured() && !isDemoMode) {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (!error && data) {
        setBriefs(data as Brief[]);
        localStorage.setItem(storageKey, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(storageKey);
        if (local) setBriefs(JSON.parse(local));
      }
    } else {
      const local = localStorage.getItem(storageKey);
      if (local) {
        setBriefs(JSON.parse(local));
      } else {
        setBriefs([]);
      }
    }
    setLoading(false);
  }, [user, isDemoMode, storageKey]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const generateBrief = async (
    snapshotData: BriefSnapshot,
    expiryDays: number = 30
  ): Promise<Brief> => {
    const shareToken = 'tb-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
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

    if (isSupabaseConfigured() && !isDemoMode) {
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
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // Also persist public lookup for token
    localStorage.setItem(`tejas_public_brief_${shareToken}`, JSON.stringify(newBrief));
    return newBrief;
  };

  const revokeBrief = async (briefId: string) => {
    if (isSupabaseConfigured() && !isDemoMode) {
      await supabase.from('briefs').update({ revoked: true }).eq('id', briefId);
    }
    const updated = briefs.map((b) => {
      if (b.id === briefId) {
        const rev = { ...b, revoked: true };
        localStorage.setItem(`tejas_public_brief_${b.share_token}`, JSON.stringify(rev));
        return rev;
      }
      return b;
    });
    setBriefs(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
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
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('share_token', shareToken)
        .single();

      if (!error && data) {
        const brief = data as Brief;
        if (brief.revoked) return { error: 'revoked' };
        if (new Date(brief.expiry_date) < new Date()) return { error: 'expired' };
        return { brief };
      }
    } catch (e) {
      // Fallback to local
    }
  }

  // Check demo data token
  if (shareToken === 'lakshmi-kisan-2026') {
    const demoBrief = {
      id: 'br-lak-01',
      user_id: 'demo-user-lakshmi',
      generated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      expiry_date: new Date(Date.now() + 28 * 86400000).toISOString(),
      revoked: false,
      share_token: 'lakshmi-kisan-2026',
      snapshot_data: {
        generatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        profileName: 'Lakshmi Devi',
        incomeType: 'seasonal' as const,
        goal: 'crop_input' as const,
        incomeRhythm: 'seasonal' as const,
        bufferDays: 48,
        proofStrength: { verified: 3, declared: 2, estimated: 1, total: 6 },
        goalReadiness: 82,
        totalIncome30d: 45000,
        totalExpenses30d: 21700,
        obligationCount: 2,
        obligationTotal: 19500,
        evidenceCount: 6,
      },
    };
    return { brief: demoBrief };
  }

  // Check local storage token
  const local = localStorage.getItem(`tejas_public_brief_${shareToken}`);
  if (local) {
    const brief = JSON.parse(local) as Brief;
    if (brief.revoked) return { error: 'revoked' };
    if (new Date(brief.expiry_date) < new Date()) return { error: 'expired' };
    return { brief };
  }

  return { error: 'not_found' };
}
