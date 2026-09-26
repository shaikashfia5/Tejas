/* ─── Tejas Command types (institution-facing module) ─── */

export type UserRole = 'field_agent' | 'admin';
export type ActionType = 'visit' | 'call' | 'tejas_field_session';
export type OutreachStatus = 'activated' | 'no_change' | 'follow_up_needed';

export interface PmjdySegment {
  id: string;
  segment_name: string;
  district: string;
  state: string;
  total_accounts: number;
  dormant_accounts: number;
  dbt_linked_accounts: number;
  dbt_linked_but_dormant: number;
  aeps_enabled_accounts: number;
  last_updated: string;
}

export interface FiIndexScore {
  id: string;
  district: string;
  fi_index_score: number;
  access_rate: number;
  usage_rate: number;
}

export interface SegmentSnapshot {
  id: string;
  segment_id: string;
  snapshot_month: string;
  total_accounts: number;
  dormant_accounts: number;
}

export interface PriorityScore {
  id: string;
  segment_id: string;
  computed_score: number;
  dormancy_rate: number;
  dbt_waste_rate: number;
  access_usage_gap: number;
  primary_driver: string;
  recommended_action: string;
  computed_at: string;
}

export interface OutreachLogEntry {
  id: string;
  segment_id: string;
  segment_name?: string;
  district?: string;
  bc_agent_id: string | null;
  bc_agent_name: string;
  action_type: ActionType;
  date: string;
  resulting_status: OutreachStatus;
  outcome_note: string | null;
  created_at: string;
}

export interface BcAgent {
  id: string;
  full_name: string;
}

/** A segment joined with its FI-Index row, computed priority, and trend. */
export interface RankedSegment {
  segment: PmjdySegment;
  fi: FiIndexScore | null;
  score: number;
  dormancyRate: number; // 0..1
  dbtWasteRate: number; // 0..1
  accessUsageGap: number; // percentage points
  primaryDriver: string;
  recommendedAction: string;
  trend: { month: string; dormancyRate: number }[];
}

export interface CommandSummary {
  totalSegments: number;
  totalDormant: number;
  avgAccessUsageGap: number;
  activatedThisMonth: number;
}
