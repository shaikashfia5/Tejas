/**
 * Centralized financial computation engine.
 * Every function returns both the computed value AND the list of
 * evidence_record IDs that contributed, enabling full traceability.
 */
import type {
  EvidenceRecord,
  Obligation,
  TrackedValue,
  IncomeRhythm,
  ProofStrength,
  ShockInput,
  ShockResult,
  GoalType,
} from '../types/database';

/* ─── Helpers ─── */

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function filterByDays(records: EvidenceRecord[], days: number): EvidenceRecord[] {
  const cutoff = daysAgo(days);
  return records.filter((r) => new Date(r.date) >= cutoff);
}

/* ─── Income Rhythm Classification ─── */

export function classifyIncomeRhythm(records: EvidenceRecord[]): TrackedValue<IncomeRhythm> {
  const incomeRecords = records.filter((r) => r.direction === 'in');
  const ids = incomeRecords.map((r) => r.id);

  if (incomeRecords.length < 3) {
    return { value: 'irregular', sourceEvidenceIds: ids };
  }

  // Group by month
  const monthly = new Map<string, number>();
  incomeRecords.forEach((r) => {
    const key = r.date.slice(0, 7); // YYYY-MM
    monthly.set(key, (monthly.get(key) || 0) + r.amount);
  });

  const amounts = Array.from(monthly.values());
  if (amounts.length < 2) {
    return { value: 'irregular', sourceEvidenceIds: ids };
  }

  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  const cv = Math.sqrt(variance) / mean; // Coefficient of variation

  // Check for seasonal patterns (large gaps between income months)
  const months = Array.from(monthly.keys()).sort();
  const gaps: number[] = [];
  for (let i = 1; i < months.length; i++) {
    const [y1, m1] = months[i - 1].split('-').map(Number);
    const [y2, m2] = months[i].split('-').map(Number);
    gaps.push((y2 - y1) * 12 + (m2 - m1));
  }
  const hasSeasonalGaps = gaps.some((g) => g >= 3);

  if (hasSeasonalGaps) {
    return { value: 'seasonal', sourceEvidenceIds: ids };
  }
  if (cv < 0.3) {
    return { value: 'regular', sourceEvidenceIds: ids };
  }
  if (cv < 0.6) {
    return { value: 'seasonal', sourceEvidenceIds: ids };
  }
  return { value: 'irregular', sourceEvidenceIds: ids };
}

/* ─── Buffer Days ─── */

export function computeBufferDays(
  records: EvidenceRecord[],
  obligations: Obligation[]
): TrackedValue<number> {
  const recent = filterByDays(records, 90);
  const ids = recent.map((r) => r.id);

  const totalIncome = recent
    .filter((r) => r.direction === 'in')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = recent
    .filter((r) => r.direction === 'out')
    .reduce((sum, r) => sum + r.amount, 0);

  const upcomingObligations = obligations
    .filter((o) => new Date(o.due_date) >= new Date())
    .reduce((sum, o) => sum + o.amount, 0);

  // Net surplus over 90 days
  const surplus = totalIncome - totalExpenses;
  // Daily average expense
  const dailyExpense = (totalExpenses + upcomingObligations) / 90 || 1;
  // Buffer = how many days the surplus can cover
  const bufferDays = Math.max(0, Math.round(surplus / dailyExpense));

  return { value: bufferDays, sourceEvidenceIds: ids };
}

/* ─── Proof Strength ─── */

export function computeProofStrength(records: EvidenceRecord[]): TrackedValue<ProofStrength> {
  const ids = records.map((r) => r.id);
  const verified = records.filter((r) => r.provenance_label === 'verified').length;
  const declared = records.filter((r) => r.provenance_label === 'declared').length;
  const estimated = records.filter((r) => r.provenance_label === 'estimated').length;
  const total = records.length;

  return {
    value: { verified, declared, estimated, total },
    sourceEvidenceIds: ids,
  };
}

/* ─── Shock Simulation ─── */

export function simulateShock(
  records: EvidenceRecord[],
  obligations: Obligation[],
  shock: ShockInput
): TrackedValue<ShockResult> {
  const buffer = computeBufferDays(records, obligations);
  const recent = filterByDays(records, 90);
  const ids = recent.map((r) => r.id);

  const totalExpenses90d = recent
    .filter((r) => r.direction === 'out')
    .reduce((sum, r) => sum + r.amount, 0);
  const dailyExpense = totalExpenses90d / 90 || 1;

  // Shock reduces the effective surplus
  const totalIncome90d = recent
    .filter((r) => r.direction === 'in')
    .reduce((sum, r) => sum + r.amount, 0);
  const newSurplus = totalIncome90d - totalExpenses90d - shock.amount;
  const newBufferDays = Math.max(0, Math.round(newSurplus / dailyExpense));

  let shortfallDate: string | null = null;
  let gapAmount = 0;

  if (newBufferDays <= 0) {
    // Calculate when shortfall occurs
    const shockDate = new Date(shock.date);
    const daysToShortfall = Math.max(0, Math.round((totalIncome90d - totalExpenses90d) / dailyExpense));
    const shortfall = new Date(shockDate);
    shortfall.setDate(shortfall.getDate() + daysToShortfall);
    shortfallDate = shortfall.toISOString().split('T')[0];
    gapAmount = Math.abs(newSurplus);
  }

  // Generate suggestion
  let suggestion = '';
  if (newBufferDays > 30) {
    suggestion = 'Your buffer is strong enough to absorb this shock comfortably.';
  } else if (newBufferDays > 7) {
    suggestion = 'You can handle this, but consider building a small additional buffer over the next few weeks.';
  } else if (newBufferDays > 0) {
    suggestion = 'This would significantly reduce your buffer. Consider setting aside small amounts regularly to build resilience.';
  } else {
    suggestion = `This shock would create a gap of ₹${gapAmount.toLocaleString('en-IN')}. Consider reaching out to your self-help group or community for support options.`;
  }

  return {
    value: {
      originalBufferDays: buffer.value,
      newBufferDays,
      shortfallDate,
      gapAmount,
      suggestion,
    },
    sourceEvidenceIds: ids,
  };
}

/* ─── Goal Readiness ─── */

const GOAL_TARGETS: Record<GoalType, number> = {
  crop_input: 25000,
  working_capital: 20000,
  emergency_buffer: 15000,
  education_fee: 30000,
  other: 20000,
};

export function computeGoalReadiness(
  records: EvidenceRecord[],
  goal: GoalType
): TrackedValue<number> {
  const recent = filterByDays(records, 90);
  const ids = recent.map((r) => r.id);

  const totalIncome = recent
    .filter((r) => r.direction === 'in')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = recent
    .filter((r) => r.direction === 'out')
    .reduce((sum, r) => sum + r.amount, 0);

  const surplus = Math.max(0, totalIncome - totalExpenses);
  const target = GOAL_TARGETS[goal] || 20000;
  const readiness = Math.min(100, Math.round((surplus / target) * 100));

  return { value: readiness, sourceEvidenceIds: ids };
}

/* ─── Aggregation Helpers ─── */

export function computeFlows(
  records: EvidenceRecord[],
  days: number
): { inflows: number; outflows: number; ids: string[] } {
  const recent = filterByDays(records, days);
  const inflows = recent
    .filter((r) => r.direction === 'in')
    .reduce((sum, r) => sum + r.amount, 0);
  const outflows = recent
    .filter((r) => r.direction === 'out')
    .reduce((sum, r) => sum + r.amount, 0);
  return { inflows, outflows, ids: recent.map((r) => r.id) };
}

export function computeMonthlyData(records: EvidenceRecord[]) {
  const monthly = new Map<string, { income: number; expenses: number; verified: number; declared: number; estimated: number }>();

  records.forEach((r) => {
    const key = r.date.slice(0, 7);
    const existing = monthly.get(key) || { income: 0, expenses: 0, verified: 0, declared: 0, estimated: 0 };

    if (r.direction === 'in') {
      existing.income += r.amount;
    } else {
      existing.expenses += r.amount;
    }
    existing[r.provenance_label] += r.amount;

    monthly.set(key, existing);
  });

  return Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      ...data,
    }));
}
