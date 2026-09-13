/* ─── Enums ─── */

export type IncomeType = 'seasonal' | 'project' | 'mixed' | 'regular-informal';
export type GoalType = 'crop_input' | 'working_capital' | 'emergency_buffer' | 'education_fee' | 'other';
export type ProvenanceLabel = 'verified' | 'declared' | 'estimated';
export type Direction = 'in' | 'out';
export type EvidenceType = 'image' | 'manual';
export type IncomeRhythm = 'regular' | 'seasonal' | 'irregular';

export type TransactionCategory =
  | 'wages'
  | 'crop_sale'
  | 'shop_sale'
  | 'transport_income'
  | 'remittance'
  | 'groceries'
  | 'rent'
  | 'medical'
  | 'education'
  | 'loan_repayment'
  | 'utility'
  | 'other';

export type ShockType =
  | 'delayed_payment'
  | 'medical_expense'
  | 'fee_deadline'
  | 'supplier_payment';

/* ─── Database Row Types ─── */

export interface Profile {
  id: string;
  full_name: string;
  language: 'en' | 'hi';
  income_type: IncomeType;
  goal: GoalType;
  onboarded: boolean;
  created_at: string;
}

export interface EvidenceRecord {
  id: string;
  user_id: string;
  type: EvidenceType;
  raw_text: string | null;
  amount: number;
  direction: Direction;
  category: TransactionCategory;
  provenance_label: ProvenanceLabel;
  date: string;
  image_url?: string | null;
  parsed_meta?: Record<string, unknown> | null;
  created_at: string;
}

export interface Obligation {
  id: string;
  user_id: string;
  description: string;
  due_date: string;
  amount: number;
  created_at: string;
}

export interface ShockScenario {
  id: string;
  user_id: string;
  scenario_type: ShockType;
  shock_amount: number;
  resulting_shortfall_date: string | null;
  resulting_gap_amount: number;
  created_at: string;
}

export interface Brief {
  id: string;
  user_id: string;
  generated_at: string;
  expiry_date: string;
  revoked: boolean;
  share_token: string;
  snapshot_data: BriefSnapshot;
}

/* ─── Computed Types ─── */

export interface TrackedValue<T> {
  value: T;
  sourceEvidenceIds: string[];
}

export interface ProofStrength {
  verified: number;
  declared: number;
  estimated: number;
  total: number;
}

export interface ShockInput {
  type: ShockType;
  amount: number;
  date: string;
}

export interface ShockResult {
  originalBufferDays: number;
  newBufferDays: number;
  shortfallDate: string | null;
  gapAmount: number;
  suggestion: string;
}

export interface BriefSnapshot {
  generatedAt: string;
  profileName: string;
  incomeType: IncomeType;
  goal: GoalType;
  incomeRhythm: IncomeRhythm;
  bufferDays: number;
  proofStrength: ProofStrength;
  goalReadiness: number;
  totalIncome30d: number;
  totalExpenses30d: number;
  obligationCount: number;
  obligationTotal: number;
  evidenceCount: number;
}

/* ─── Offline Queue ─── */

export interface QueuedEntry {
  id: string;
  data: Omit<EvidenceRecord, 'id' | 'created_at'>;
  timestamp: number;
  synced: boolean;
}

/* ─── Classifier Output ─── */

export interface ClassifierResult {
  date: string;
  amount: number;
  direction: Direction;
  category: TransactionCategory;
  confidence: number;
  provenance_label: ProvenanceLabel;
}
