import type {
  PmjdySegment,
  FiIndexScore,
  SegmentSnapshot,
  OutreachLogEntry,
  BcAgent,
} from '../types/command';

/* ⚠ DEMO DATA — synthetic, clearly labeled. NOT sourced from PMJDY, DBT
   Mission, RBI FI-Index, or NPCI. Used only when Tejas Command runs without
   a Supabase connection (local dev / offline demo). */

export const DEMO_SEGMENTS: PmjdySegment[] = [
  { id: 'seg-01', segment_name: 'Ramnagar Block', district: 'Barabanki', state: 'Uttar Pradesh', total_accounts: 18400, dormant_accounts: 7180, dbt_linked_accounts: 11250, dbt_linked_but_dormant: 6180, aeps_enabled_accounts: 9700, last_updated: daysAgo(3) },
  { id: 'seg-02', segment_name: 'Sirauli Gauspur', district: 'Barabanki', state: 'Uttar Pradesh', total_accounts: 12100, dormant_accounts: 3690, dbt_linked_accounts: 6800, dbt_linked_but_dormant: 2420, aeps_enabled_accounts: 7300, last_updated: daysAgo(3) },
  { id: 'seg-03', segment_name: 'Haidargarh Block', district: 'Sitapur', state: 'Uttar Pradesh', total_accounts: 15200, dormant_accounts: 6350, dbt_linked_accounts: 8900, dbt_linked_but_dormant: 5120, aeps_enabled_accounts: 7600, last_updated: daysAgo(5) },
  { id: 'seg-04', segment_name: 'Shivgarh Block', district: 'Rae Bareli', state: 'Uttar Pradesh', total_accounts: 16900, dormant_accounts: 5210, dbt_linked_accounts: 10400, dbt_linked_but_dormant: 4160, aeps_enabled_accounts: 11200, last_updated: daysAgo(4) },
  { id: 'seg-05', segment_name: 'Banke Bazar Block', district: 'Gaya', state: 'Bihar', total_accounts: 13800, dormant_accounts: 6210, dbt_linked_accounts: 7300, dbt_linked_but_dormant: 5110, aeps_enabled_accounts: 5200, last_updated: daysAgo(6) },
  { id: 'seg-06', segment_name: 'Imamganj Block', district: 'Gaya', state: 'Bihar', total_accounts: 9400, dormant_accounts: 4100, dbt_linked_accounts: 4900, dbt_linked_but_dormant: 3580, aeps_enabled_accounts: 3400, last_updated: daysAgo(6) },
  { id: 'seg-07', segment_name: 'Katra Block', district: 'Muzaffarpur', state: 'Bihar', total_accounts: 17600, dormant_accounts: 5980, dbt_linked_accounts: 10100, dbt_linked_but_dormant: 4340, aeps_enabled_accounts: 9400, last_updated: daysAgo(2) },
  { id: 'seg-08', segment_name: 'Bochaha Block', district: 'Muzaffarpur', state: 'Bihar', total_accounts: 11300, dormant_accounts: 4180, dbt_linked_accounts: 6200, dbt_linked_but_dormant: 3350, aeps_enabled_accounts: 5100, last_updated: daysAgo(2) },
  { id: 'seg-09', segment_name: 'Rajnagar Block', district: 'Madhubani', state: 'Bihar', total_accounts: 14700, dormant_accounts: 6900, dbt_linked_accounts: 7800, dbt_linked_but_dormant: 5700, aeps_enabled_accounts: 4800, last_updated: daysAgo(7) },
  { id: 'seg-10', segment_name: 'Hanumana Block', district: 'Rewa', state: 'Madhya Pradesh', total_accounts: 12900, dormant_accounts: 5420, dbt_linked_accounts: 7100, dbt_linked_but_dormant: 3900, aeps_enabled_accounts: 6300, last_updated: daysAgo(3) },
  { id: 'seg-11', segment_name: 'Kusmi Block', district: 'Sidhi', state: 'Madhya Pradesh', total_accounts: 8600, dormant_accounts: 3960, dbt_linked_accounts: 4300, dbt_linked_but_dormant: 3090, aeps_enabled_accounts: 3500, last_updated: daysAgo(8) },
  { id: 'seg-12', segment_name: 'Bada Malhera', district: 'Chhatarpur', state: 'Madhya Pradesh', total_accounts: 10200, dormant_accounts: 4490, dbt_linked_accounts: 5600, dbt_linked_but_dormant: 3530, aeps_enabled_accounts: 4900, last_updated: daysAgo(5) },
];

export const DEMO_FI_SCORES: FiIndexScore[] = [
  { id: 'fi-01', district: 'Barabanki', fi_index_score: 52.4, access_rate: 78.3, usage_rate: 41.2 },
  { id: 'fi-02', district: 'Sitapur', fi_index_score: 48.9, access_rate: 74.6, usage_rate: 38.1 },
  { id: 'fi-03', district: 'Rae Bareli', fi_index_score: 55.1, access_rate: 81.0, usage_rate: 45.7 },
  { id: 'fi-04', district: 'Gaya', fi_index_score: 44.2, access_rate: 70.8, usage_rate: 33.9 },
  { id: 'fi-05', district: 'Muzaffarpur', fi_index_score: 50.6, access_rate: 77.2, usage_rate: 40.5 },
  { id: 'fi-06', district: 'Madhubani', fi_index_score: 42.8, access_rate: 68.4, usage_rate: 31.6 },
  { id: 'fi-07', district: 'Rewa', fi_index_score: 47.3, access_rate: 73.5, usage_rate: 36.8 },
  { id: 'fi-08', district: 'Sidhi', fi_index_score: 41.5, access_rate: 66.9, usage_rate: 30.2 },
  { id: 'fi-09', district: 'Chhatarpur', fi_index_score: 45.8, access_rate: 72.1, usage_rate: 34.7 },
];

export const DEMO_SNAPSHOTS: SegmentSnapshot[] = DEMO_SEGMENTS.flatMap((seg) =>
  Array.from({ length: 6 }, (_, n) => {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - (5 - n));
    monthDate.setDate(1);
    const total = seg.total_accounts + n * 120;
    const dormant = Math.min(seg.dormant_accounts + n * 260, total);
    return {
      id: `snap-${seg.id}-${n}`,
      segment_id: seg.id,
      snapshot_month: monthDate.toISOString().slice(0, 10),
      total_accounts: total,
      dormant_accounts: dormant,
    };
  })
);

export const DEMO_OUTREACH: OutreachLogEntry[] = [
  { id: 'out-01', segment_id: 'seg-01', segment_name: 'Ramnagar Block', district: 'Barabanki', bc_agent_id: null, bc_agent_name: 'Sunita Devi', action_type: 'tejas_field_session', date: dateStr(9), resulting_status: 'activated', outcome_note: 'Passport brief generated; first AePS withdrawal done', created_at: dateStr(9) },
  { id: 'out-02', segment_id: 'seg-01', segment_name: 'Ramnagar Block', district: 'Barabanki', bc_agent_id: null, bc_agent_name: 'Rekha Singh', action_type: 'visit', date: dateStr(3), resulting_status: 'follow_up_needed', outcome_note: '2 dormants need Aadhaar-seed fixes', created_at: dateStr(3) },
  { id: 'out-03', segment_id: 'seg-03', segment_name: 'Haidargarh Block', district: 'Sitapur', bc_agent_id: null, bc_agent_name: 'Sunita Devi', action_type: 'call', date: dateStr(6), resulting_status: 'no_change', outcome_note: 'Holder away for harvest season', created_at: dateStr(6) },
  { id: 'out-04', segment_id: 'seg-05', segment_name: 'Banke Bazar Block', district: 'Gaya', bc_agent_id: null, bc_agent_name: 'Meena Kumari', action_type: 'visit', date: dateStr(8), resulting_status: 'no_change', outcome_note: 'AePS biometric failures reported', created_at: dateStr(8) },
  { id: 'out-05', segment_id: 'seg-09', segment_name: 'Rajnagar Block', district: 'Madhubani', bc_agent_id: null, bc_agent_name: 'Meena Kumari', action_type: 'tejas_field_session', date: dateStr(5), resulting_status: 'activated', outcome_note: '3 accounts activated during camp', created_at: dateStr(5) },
];

export const DEMO_AGENTS: BcAgent[] = [
  { id: 'agent-01', full_name: 'Sunita Devi' },
  { id: 'agent-02', full_name: 'Rekha Singh' },
  { id: 'agent-03', full_name: 'Meena Kumari' },
  { id: 'agent-04', full_name: 'Anita Yadav' },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
