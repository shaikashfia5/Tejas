/**
 * Tejas Command — data-driven targeting engine.
 *
 * Pure functions (same pattern as computations.ts in Tejas Field): every
 * ranked segment carries not just a score but the DOMINANT driver in plain
 * language — the explainability principle Field uses for individuals,
 * applied here to institutional targeting.
 *
 * Equal-thirds weighting (locked decision):
 *   dormancy rate + wasted DBT linkage + district access-usage gap.
 */
import type {
  PmjdySegment,
  FiIndexScore,
  SegmentSnapshot,
  RankedSegment,
} from '../types/command';

export interface PriorityBreakdown {
  dormancyRate: number; // 0..1
  dbtWasteRate: number; // 0..1
  accessUsageGap: number; // percentage points (0..100)
  score: number; // 0..100
  primaryDriver: 'dbt_waste' | 'dormancy' | 'access_usage_gap';
  driverText: string;
  recommendedAction: string;
}

/** Signals for one segment, with the dominant driver called out. */
export function computePriority(
  segment: PmjdySegment,
  fi: FiIndexScore | null
): PriorityBreakdown {
  const dormancyRate = segment.total_accounts > 0
    ? segment.dormant_accounts / segment.total_accounts
    : 0;
  const dbtWasteRate = segment.dbt_linked_accounts > 0
    ? segment.dbt_linked_but_dormant / segment.dbt_linked_accounts
    : 0;
  const accessUsageGap = fi ? fi.access_rate - fi.usage_rate : 0;

  // Each normalized to 0..100, then equal thirds.
  const dormancyPts = dormancyRate * 100;
  const dbtWastePts = dbtWasteRate * 100;
  const score = Math.min(100, (dormancyPts + dbtWastePts + accessUsageGap) / 3);

  // Dominant driver = the largest of the three (normalized comparison).
  const signals: Array<{ key: PriorityBreakdown['primaryDriver']; pts: number }> = [
    { key: 'dbt_waste', pts: dbtWastePts },
    { key: 'dormancy', pts: dormancyPts },
    { key: 'access_usage_gap', pts: accessUsageGap },
  ];
  signals.sort((a, b) => b.pts - a.pts);
  const dominant = signals[0].key;

  const driverText =
    dominant === 'dbt_waste'
      ? `${Math.round(dbtWasteRate * 100)}% of DBT-linked accounts here are dormant — prioritize AePS enablement visits`
      : dominant === 'dormancy'
        ? `${Math.round(dormancyRate * 100)}% of accounts are fully dormant — schedule a Tejas Field activation session`
        : fi
          ? `FI-Index shows a ${accessUsageGap.toFixed(1)} pt access-usage gap in this district — focus on first-transaction assistance`
          : 'FI-Index data unavailable for this district — manual review recommended';

  const recommendedAction =
    dominant === 'dbt_waste'
      ? 'AePS enablement camp + DBT usage walkthrough'
      : dominant === 'dormancy'
        ? 'Doorstep activation visit with BC Sakhi'
        : 'First-transaction assistance drive';

  return { dormancyRate, dbtWasteRate, accessUsageGap, score, primaryDriver: dominant, driverText, recommendedAction };
}

/** Build the ranked list: score desc, with 6-month dormancy trend attached. */
export function rankSegments(
  segments: PmjdySegment[],
  fiScores: FiIndexScore[],
  snapshots: SegmentSnapshot[]
): RankedSegment[] {
  const fiByDistrict = new Map(fiScores.map((f) => [f.district, f]));
  const snapsBySegment = new Map<string, SegmentSnapshot[]>();
  for (const s of snapshots) {
    const list = snapsBySegment.get(s.segment_id) ?? [];
    list.push(s);
    snapsBySegment.set(s.segment_id, list);
  }

  return segments
    .map((segment): RankedSegment => {
      const fi = fiByDistrict.get(segment.district) ?? null;
      const p = computePriority(segment, fi);
      const trend = (snapsBySegment.get(segment.id) ?? [])
        .slice()
        .sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month))
        .map((s) => ({
          month: s.snapshot_month,
          dormancyRate: s.total_accounts > 0 ? s.dormant_accounts / s.total_accounts : 0,
        }));
      return {
        segment,
        fi,
        score: Math.round(p.score * 100) / 100,
        dormancyRate: p.dormancyRate,
        dbtWasteRate: p.dbtWasteRate,
        accessUsageGap: p.accessUsageGap,
        primaryDriver: p.driverText,
        recommendedAction: p.recommendedAction,
        trend,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Summary stats row for the Command Overview. */
export function buildSummary(
  ranked: RankedSegment[],
  outreach: { resulting_status: string; date: string }[]
): { totalSegments: number; totalDormant: number; avgAccessUsageGap: number; activatedThisMonth: number } {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    totalSegments: ranked.length,
    totalDormant: ranked.reduce((sum, r) => sum + r.segment.dormant_accounts, 0),
    avgAccessUsageGap: ranked.length
      ? Math.round((ranked.reduce((sum, r) => sum + r.accessUsageGap, 0) / ranked.length) * 10) / 10
      : 0,
    activatedThisMonth: outreach.filter(
      (o) => o.resulting_status === 'activated' && new Date(o.date) >= monthStart
    ).length,
  };
}

/** Badge tier, aligned with PassportCard's rose/amber/emerald pattern. */
export function scoreTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 66) return 'high';
  if (score >= 33) return 'medium';
  return 'low';
}
