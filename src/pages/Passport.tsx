import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  TrendingUp,
  ShieldCheck,
  CalendarCheck,
  Target,
  PieChart,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvidence } from '../hooks/useEvidence';
import { useObligations } from '../hooks/useObligations';
import { useI18n } from '../lib/i18n';
import {
  classifyIncomeRhythm,
  computeBufferDays,
  computeProofStrength,
  computeGoalReadiness,
  computeFlows,
} from '../lib/computations';
import { PassportCard } from '../components/PassportCard';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

export const Passport: React.FC = () => {
  const { profile } = useAuth();
  const { evidence } = useEvidence();
  const { obligations } = useObligations();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Financial indicators
  const rhythm = classifyIncomeRhythm(evidence);
  const buffer = computeBufferDays(evidence, obligations);
  const proof = computeProofStrength(evidence);
  const goalReadiness = computeGoalReadiness(evidence, profile?.goal || 'crop_input');
  const flows = computeFlows(evidence, 30);

  const upcomingObligationsTotal = obligations
    .filter((o) => new Date(o.due_date) >= new Date())
    .reduce((sum, o) => sum + o.amount, 0);

  // Contributing records for each card
  const incomeEvidence = evidence.filter((e) => e.direction === 'in');
  const expenseEvidence = evidence.filter((e) => e.direction === 'out');

  return (
    <div className="page-container space-y-5 animate-fade-in">
      {/* Passport Profile Badge Header */}
      <div className="glass-card p-5 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-navy-950 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
              <Sparkles size={14} />
              <span>Verified Financial Continuity Passport</span>
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {profile?.full_name || 'Entrepreneur'}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Sector: <span className="font-semibold text-amber-300 capitalize">{profile?.income_type || 'Seasonal'}</span> • Goal: <span className="font-semibold text-amber-300 capitalize">{profile?.goal?.replace('_', ' ') || 'Working Capital'}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/share')}
            className="btn-primary !py-2 !px-3.5 !text-xs gap-1.5 shadow-md"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 5 Core Passport Indicator Cards */}
      <div className="space-y-4">
        {/* 1. Resilience Buffer */}
        <PassportCard
          title={t('passport.resilience')}
          subtitle="Days of operational & essential runway"
          value={
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">
                {buffer.value}
              </span>
              <span className="text-sm font-semibold text-slate-300">
                {t('passport.days')}
              </span>
            </div>
          }
          icon={ShieldCheck}
          badgeText={buffer.value > 30 ? 'Strong' : buffer.value > 7 ? 'Moderate' : 'Critical'}
          badgeColor={buffer.value > 30 ? 'emerald' : buffer.value > 7 ? 'amber' : 'amber'}
          proofStrength={proof.value}
          sourceEvidence={evidence}
        />

        {/* 2. Income Pattern */}
        <PassportCard
          title={t('passport.income_pattern')}
          subtitle="Cash-flow predictability rating"
          value={
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white capitalize">
                {rhythm.value}
              </span>
              <ProvenanceBadge label="verified" size="sm" />
            </div>
          }
          icon={TrendingUp}
          badgeText={`₹${flows.inflows.toLocaleString('en-IN')} (30d)`}
          badgeColor="blue"
          proofStrength={proof.value}
          sourceEvidence={incomeEvidence}
        />

        {/* 3. Obligation Map */}
        <PassportCard
          title={t('passport.obligation_map')}
          subtitle="Scheduled commitments & supplier debts"
          value={
            <div>
              <span className="text-2xl font-black text-white">
                ₹{upcomingObligationsTotal.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                Across {obligations.length} active obligations
              </span>
            </div>
          }
          icon={CalendarCheck}
          badgeText={`${obligations.length} items`}
          badgeColor="indigo"
          proofStrength={proof.value}
          sourceEvidence={expenseEvidence}
        />

        {/* 4. Proof Strength & Provenance Ratio */}
        <PassportCard
          title={t('passport.proof_strength')}
          subtitle="Ratio of hard receipts vs declared logs"
          value={
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">
                  {Math.round(((proof.value.verified) / (proof.value.total || 1)) * 100)}%
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  OCR Verified Proof
                </span>
              </div>
            </div>
          }
          icon={PieChart}
          badgeText={`${proof.value.total} total proofs`}
          badgeColor="emerald"
          proofStrength={proof.value}
          sourceEvidence={evidence}
        />

        {/* 5. Goal Readiness */}
        <PassportCard
          title={t('passport.goal_readiness')}
          subtitle={`Progress towards ${profile?.goal?.replace('_', ' ') || 'target'}`}
          value={
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-amber-400">
                  {goalReadiness.value}%
                </span>
                <span className="text-xs text-slate-400">
                  {t('passport.toward_goal')}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  style={{ width: `${goalReadiness.value}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                />
              </div>
            </div>
          }
          icon={Target}
          badgeText="Target Aligned"
          badgeColor="amber"
          proofStrength={proof.value}
          sourceEvidence={incomeEvidence}
        />
      </div>

      {/* Share CTA Footer Banner */}
      <div className="p-4 rounded-2xl bg-slate-800/90 border border-white/10 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-white">Need a loan or supplier credit?</h4>
          <p className="text-[11px] text-slate-400">
            Generate a secure, time-limited brief to share with lenders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/share')}
          className="btn-primary !py-2.5 !px-4 !text-xs shrink-0"
        >
          <span>Share Brief</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
