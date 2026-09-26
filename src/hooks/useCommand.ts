import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  DEMO_SEGMENTS,
  DEMO_FI_SCORES,
  DEMO_SNAPSHOTS,
  DEMO_OUTREACH,
  DEMO_AGENTS,
} from '../lib/commandDemoData';
import { rankSegments, buildSummary } from '../lib/commandEngine';
import type {
  PmjdySegment,
  FiIndexScore,
  SegmentSnapshot,
  OutreachLogEntry,
  RankedSegment,
  BcAgent,
} from '../types/command';

/**
 * Loads Tejas Command data from Supabase when configured, falling back to
 * the clearly-labeled synthetic dataset for local/offline demo runs.
 */
export function useCommand() {
  const { isSupabaseUser } = useAuth();
  const [ranked, setRanked] = useState<RankedSegment[]>([]);
  const [outreach, setOutreach] = useState<OutreachLogEntry[]>([]);
  const [summary, setSummary] = useState({ totalSegments: 0, totalDormant: 0, avgAccessUsageGap: 0, activatedThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [isDemoData, setIsDemoData] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);

    if (isSupabaseConfigured() && isSupabaseUser) {
      const [segmentsRes, fiRes, snapsRes, outreachRes] = await Promise.all([
        supabase.from('pmjdy_segments').select('*'),
        supabase.from('fi_index_scores').select('*'),
        supabase.from('pmjdy_segment_snapshots').select('*'),
        supabase
          .from('outreach_log')
          .select('*, pmjdy_segments(segment_name, district)')
          .order('date', { ascending: false }),
      ]);

      const allOk = !segmentsRes.error && !fiRes.error && !snapsRes.error && !outreachRes.error;
      if (allOk) {
        const segments = segmentsRes.data as PmjdySegment[];
        const fi = fiRes.data as FiIndexScore[];
        const snaps = snapsRes.data as SegmentSnapshot[];
        const raw = (outreachRes.data as Array<Record<string, unknown>>) ?? [];
        const log: OutreachLogEntry[] = raw.map((row) => {
          const seg = row.pmjdy_segments as { segment_name?: string; district?: string } | null;
          const { pmjdy_segments: _seg, ...rest } = row;
          void _seg;
          return {
            ...(rest as unknown as OutreachLogEntry),
            segment_name: seg?.segment_name,
            district: seg?.district,
          };
        });

        const r = rankSegments(segments, fi, snaps);
        if (mounted.current) {
          setRanked(r);
          setOutreach(log);
          setSummary(buildSummary(r, log));
          setIsDemoData(false);
          setLoading(false);
        }
        return;
      }
      // fall through to demo data on query failure (e.g. migration not run)
    }

    const r = rankSegments(DEMO_SEGMENTS, DEMO_FI_SCORES, DEMO_SNAPSHOTS);
    if (mounted.current) {
      setRanked(r);
      setOutreach(DEMO_OUTREACH);
      setSummary(buildSummary(r, DEMO_OUTREACH));
      setIsDemoData(true);
      setLoading(false);
    }
  }, [isSupabaseUser]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  /** Assign a BC agent to a segment → outreach_log row, status follow_up_needed. */
  const assignAgent = useCallback(
    async (segmentId: string, agent: BcAgent): Promise<{ error?: string }> => {
      const entry: OutreachLogEntry = {
        id: 'out-' + crypto.randomUUID(),
        segment_id: segmentId,
        bc_agent_id: null,
        bc_agent_name: agent.full_name,
        action_type: 'visit',
        date: new Date().toISOString().slice(0, 10),
        resulting_status: 'follow_up_needed',
        outcome_note: 'Assigned via Tejas Command',
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured() && isSupabaseUser && !isDemoData) {
        const { error } = await supabase.from('outreach_log').insert({
          segment_id: segmentId,
          bc_agent_id: null,
          bc_agent_name: agent.full_name,
          action_type: 'visit',
          date: entry.date,
          resulting_status: 'follow_up_needed',
          outcome_note: entry.outcome_note,
        });
        if (error) return { error: error.message };
      }

      const seg = ranked.find((r) => r.segment.id === segmentId)?.segment;
      setOutreach((prev) => [
        { ...entry, segment_name: seg?.segment_name, district: seg?.district },
        ...prev,
      ]);
      if (isDemoData) setSummary(buildSummary(ranked, [entry, ...outreach]));
      return {};
    },
    [isSupabaseUser, isDemoData, ranked, outreach]
  );

  return {
    ranked,
    outreach,
    summary,
    agents: DEMO_AGENTS,
    loading,
    isDemoData,
    refresh: load,
    assignAgent,
  };
}
