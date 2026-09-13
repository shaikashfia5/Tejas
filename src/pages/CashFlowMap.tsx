import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Layers,
  Plus,
  Trash2,
  X,
  Clock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvidence } from '../hooks/useEvidence';
import { useObligations } from '../hooks/useObligations';
import { useI18n } from '../lib/i18n';
import {
  classifyIncomeRhythm,
  computeBufferDays,
  computeFlows,
  computeMonthlyData,
} from '../lib/computations';
import { CashFlowChart } from '../components/CashFlowChart';
import { BufferIndicator } from '../components/BufferIndicator';
import { EvidenceCard } from '../components/EvidenceCard';

export const CashFlowMap: React.FC = () => {
  const { user } = useAuth();
  const { evidence } = useEvidence();
  const { obligations, addObligation, deleteObligation } = useObligations();
  const { t } = useI18n();

  const [timeRange, setTimeRange] = useState<30 | 90>(30);
  const [showAddObligation, setShowAddObligation] = useState(false);
  const [traceSourceIds, setTraceSourceIds] = useState<string[] | null>(null);
  const [traceTitle, setTraceTitle] = useState<string>('');

  // Obligation Form State
  const [obDesc, setObDesc] = useState('');
  const [obAmount, setObAmount] = useState<number | ''>('');
  const [obDue, setObDue] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );

  // Computations
  const rhythm = classifyIncomeRhythm(evidence);
  const buffer = computeBufferDays(evidence, obligations);
  const flows = computeFlows(evidence, timeRange);
  const monthlyData = computeMonthlyData(evidence);

  const handleCreateObligation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obAmount || !obDesc || !user) return;

    await addObligation({
      user_id: user.id,
      description: obDesc,
      amount: Number(obAmount),
      due_date: obDue,
    });

    setObDesc('');
    setObAmount('');
    setShowAddObligation(false);
  };

  const openTraceability = (title: string, ids: string[]) => {
    setTraceTitle(title);
    setTraceSourceIds(ids);
  };

  const tracedEvidence = evidence.filter((e) =>
    traceSourceIds?.includes(e.id)
  );

  return (
    <div className="page-container space-y-5 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="page-title">{t('cashflow.title')}</h1>
        <p className="text-xs text-slate-400">{t('cashflow.subtitle')}</p>
      </div>

      {/* Resilience Buffer Indicator Card */}
      <div
        className="cursor-pointer transition-transform active:scale-[0.99]"
        onClick={() => openTraceability('Resilience Buffer Evidence', buffer.sourceEvidenceIds)}
      >
        <BufferIndicator days={buffer.value} size="lg" />
      </div>

      {/* Rhythm & Inflow/Outflow Grid */}
      <div className="space-y-2">
        {/* Time Window Selector */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Income Rhythm:</span>
            <span
              onClick={() => openTraceability('Income Rhythm Classification', rhythm.sourceEvidenceIds)}
              className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer hover:bg-amber-500/30"
            >
              {rhythm.value.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setTimeRange(30)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeRange === 30
                  ? 'bg-amber-500 text-navy-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => setTimeRange(90)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeRange === 90
                  ? 'bg-amber-500 text-navy-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              90D
            </button>
          </div>
        </div>

        {/* Inflows & Outflows Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => openTraceability(`Inflows (Last ${timeRange} Days)`, flows.ids)}
            className="glass-card-hover p-4 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
              <ArrowDownLeft size={16} />
              <span>{t('cashflow.inflows')}</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              ₹{flows.inflows.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Layers size={11} />
              <span>Tap to trace {timeRange}d proofs</span>
            </p>
          </div>

          <div
            onClick={() => openTraceability(`Outflows (Last ${timeRange} Days)`, flows.ids)}
            className="glass-card-hover p-4 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-1">
              <ArrowUpRight size={16} />
              <span>{t('cashflow.outflows')}</span>
            </div>
            <div className="text-xl font-extrabold text-slate-200">
              ₹{flows.outflows.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Layers size={11} />
              <span>Tap to trace {timeRange}d proofs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Recharts Cash Flow Bar Chart */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-400" />
          <span>Monthly Cash Trajectory (मासिक नकदी प्रवाह)</span>
        </h3>
        <CashFlowChart data={monthlyData} />
      </div>

      {/* Upcoming Obligations Section */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar size={16} className="text-amber-400" />
            <span>{t('cashflow.obligations')}</span>
          </h3>

          <button
            type="button"
            onClick={() => setShowAddObligation(true)}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 p-1"
          >
            <Plus size={14} />
            <span>{t('cashflow.add_obligation')}</span>
          </button>
        </div>

        {obligations.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            {t('cashflow.no_obligations')}
          </p>
        ) : (
          <div className="space-y-2">
            {obligations.map((ob) => (
              <div
                key={ob.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-between gap-3 group"
              >
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {ob.description}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock size={11} />
                    <span>Due: {ob.due_date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-rose-300">
                    ₹{ob.amount.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteObligation(ob.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Obligation Modal */}
      {showAddObligation && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm">
                {t('cashflow.add_obligation')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddObligation(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateObligation} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  {t('cashflow.obligation.desc')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Loan EMI, Seed Supplier"
                  value={obDesc}
                  onChange={(e) => setObDesc(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  {t('cashflow.obligation.amount')}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={obAmount}
                  onChange={(e) => setObAmount(Number(e.target.value) || '')}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  {t('cashflow.obligation.due')}
                </label>
                <input
                  type="date"
                  required
                  value={obDue}
                  onChange={(e) => setObDue(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddObligation(false)}
                  className="btn-secondary flex-1"
                >
                  {t('general.close')}
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {t('general.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Traceability Drill-down Modal */}
      {traceSourceIds && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base leading-tight">
                  {traceTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {tracedEvidence.length} contributing evidence records
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTraceSourceIds(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {tracedEvidence.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No direct evidence records linked to this calculation.
                </p>
              ) : (
                tracedEvidence.map((rec) => (
                  <EvidenceCard key={rec.id} record={rec} showRawText={true} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
