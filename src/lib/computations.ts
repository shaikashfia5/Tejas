/**
 * Centralized financial computation engine.
 * Every function returns both the computed value AND the list of
 * evidence_record IDs that contributed, enabling full traceability.
 *
 * Buffer & shock math uses a dated cashflow projection:
 *   - starting position = net cash generated over the last 90 days
 *     (proxy for available savings — no absolute balance is tracked yet)
 *   - daily net flow    = average daily income − average daily expense (90d)
 *   - one-time events   = obligations subtracted on their due dates
 *   - shock             = subtracted on the chosen date
 * The projection walks forward day by day and reports the first day the
 * balance goes negative. This avoids the previous double-counting bug where
 * upcoming obligations were folded into the daily expense rate.
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
  Direction,
} from '../types/database';

/* ─── Helpers ─── */

const PROJECTION_HORIZON_DAYS = 90;
const DAY_MS = 86_400_000;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function filterByDays(records: EvidenceRecord[], days: number): EvidenceRecord[] {
  const cutoff = daysAgo(days);
  return records.filter((r) => new Date(r.date) >= cutoff);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function averageDailyFlow(
  records: EvidenceRecord[],
  direction: Direction,
  windowDays: number
): number {
  const recent = filterByDays(records, windowDays);
  const total = recent
    .filter((r) => r.direction === direction)
    .reduce((sum, r) => sum + r.amount, 0);
  return total / windowDays;
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

/* ─── Cashflow Projection ─── */

export interface CashflowProjection {
  /** Days the projected balance stays ≥ 0 (capped at the 90-day horizon). */
  bufferDays: number;
  /** First day the projected balance goes negative, if any. */
  shortfallDate: string | null;
  /** How much short the balance is on the shortfall day (₹). */
  gapAmount: number;
  horizonDays: number;
}

export function projectCashflow(
  records: EvidenceRecord[],
  obligations: Obligation[],
  shock?: ShockInput
): TrackedValue<CashflowProjection> {
  const recent = filterByDays(records, 90);
  const ids = recent.map((r) => r.id);

  const dailyIn = averageDailyFlow(records, 'in', 90);
  const dailyOut = averageDailyFlow(records, 'out', 90);
  const netDaily = dailyIn - dailyOut;

  // Starting position: net cash generated over the last 90 days.
  let balance = Math.max(0, netDaily * 90);

  // One-time cash events (obligations, shock) keyed by days-from-today.
  const eventsByDay = new Map<number, number>();
  const today = startOfDay(new Date());

  const dayIndexFor = (dateStr: string): number => {
    const diffMs = startOfDay(new Date(dateStr)).getTime() - today.getTime();
    return Math.round(diffMs / DAY_MS);
  };

  for (const o of obligations) {
    const d = dayIndexFor(o.due_date);
    if (d < 0) continue; // past-due obligations are already reflected in history
    const day = Math.min(d, PROJECTION_HORIZON_DAYS);
    eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + o.amount);
  }

  if (shock) {
    const d = dayIndexFor(shock.date);
    const day = d < 0 ? 0 : Math.min(d, PROJECTION_HORIZON_DAYS);
    eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + shock.amount);
  }

  let bufferDays = PROJECTION_HORIZON_DAYS;
  let shortfallDate: string | null = null;
  let gapAmount = 0;

  for (let day = 0; day < PROJECTION_HORIZON_DAYS; day++) {
    balance += netDaily;
    const eventAmount = eventsByDay.get(day);
    if (eventAmount) balance -= eventAmount;

    if (balance < 0) {
      bufferDays = day;
      shortfallDate = isoDate(new Date(today.getTime() + day * DAY_MS));
      gapAmount = Math.round(Math.abs(balance));
      break;
    }
  }

  return {
    value: { bufferDays, shortfallDate, gapAmount, horizonDays: PROJECTION_HORIZON_DAYS },
    sourceEvidenceIds: ids,
  };
}

/* ─── Buffer Days ─── */

export function computeBufferDays(
  records: EvidenceRecord[],
  obligations: Obligation[]
): TrackedValue<number> {
  const projection = projectCashflow(records, obligations);
  return {
    value: projection.value.bufferDays,
    sourceEvidenceIds: projection.sourceEvidenceIds,
  };
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
  const baseline = projectCashflow(records, obligations);
  const shocked = projectCashflow(records, obligations, shock);
  const gapAmount = shocked.value.gapAmount;

  // Generate suggestion
  let suggestion = '';
  if (shocked.value.shortfallDate === null) {
    suggestion =
      shocked.value.bufferDays >= 60
        ? 'Your buffer is strong enough to absorb this shock comfortably.'
        : 'You can handle this, but consider building a small additional buffer over the next few weeks.';
  } else if (shocked.value.bufferDays > 7) {
    suggestion =
      'This would significantly reduce your buffer. Consider setting aside small amounts regularly to build resilience.';
  } else {
    suggestion = `This shock would create a gap of ₹${gapAmount.toLocaleString('en-IN')} around ${shocked.value.shortfallDate}. Consider reaching out to your self-help group or community for support options.`;
  }

  return {
    value: {
      originalBufferDays: baseline.value.bufferDays,
      newBufferDays: shocked.value.bufferDays,
      shortfallDate: shocked.value.shortfallDate,
      gapAmount,
      suggestion,
    },
    sourceEvidenceIds: baseline.sourceEvidenceIds,
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
