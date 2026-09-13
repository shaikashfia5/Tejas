import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Award,
  TrendingUp,
  Target,
  Download,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { fetchPublicBrief } from '../hooks/useBriefs';
import { ProvenanceBar } from '../components/ProvenanceBar';
import { downloadBriefPdf } from '../lib/pdfGenerator';
import type { Brief } from '../types/database';

export const PublicBrief: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        setErrorStatus('not_found');
        setLoading(false);
        return;
      }
      const res = await fetchPublicBrief(token);
      if (res.error) {
        setErrorStatus(res.error);
      } else if (res.brief) {
        setBrief(res.brief);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const handleDownload = async () => {
    if (!brief || !token) return;
    setDownloading(true);
    try {
      await downloadBriefPdf(brief.snapshot_data, token);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center p-4">
        <div className="spinner" />
      </div>
    );
  }

  if (errorStatus || !brief) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full text-center p-8 space-y-4 border-rose-500/30">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">
            Brief No Longer Available
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {errorStatus === 'revoked'
              ? 'Consent for this brief was revoked by the entrepreneur.'
              : errorStatus === 'expired'
              ? 'This brief snapshot has expired.'
              : 'The requested brief token could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  const s = brief.snapshot_data;

  return (
    <div className="min-h-screen bg-navy-900 text-white py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        {/* Top Header */}
        <div className="glass-card p-5 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-navy-950 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                <Sparkles size={14} />
                <span>Financial Continuity Passport</span>
              </div>
              <h1 className="text-2xl font-black text-white">{s.profileName}</h1>
              <p className="text-xs text-slate-300 mt-1">
                Income Model:{' '}
                <span className="font-semibold text-amber-300 capitalize">
                  {s.incomeType}
                </span>{' '}
                • Primary Goal:{' '}
                <span className="font-semibold text-amber-300 capitalize">
                  {s.goal.replace('_', ' ')}
                </span>
              </p>
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="btn-primary !py-2 !px-3.5 !text-xs gap-1.5"
            >
              <Download size={14} />
              <span>{downloading ? 'PDF...' : 'PDF'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              <span>Generated: {new Date(brief.generated_at).toLocaleDateString('en-IN')}</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Clock size={12} />
              <span>Valid till: {new Date(brief.expiry_date).toLocaleDateString('en-IN')}</span>
            </span>
          </div>
        </div>

        {/* Aggregated Indicators Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Resilience Buffer */}
          <div className="glass-card p-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Resilience Buffer
            </span>
            <div className="text-2xl font-black text-emerald-400">
              {s.bufferDays} <span className="text-xs font-normal text-slate-300">Days</span>
            </div>
            <p className="text-[10px] text-slate-400">Operational runway</p>
          </div>

          {/* Income Rhythm */}
          <div className="glass-card p-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Income Rhythm
            </span>
            <div className="text-2xl font-black text-white capitalize">
              {s.incomeRhythm}
            </div>
            <p className="text-[10px] text-slate-400">Cash stability index</p>
          </div>

          {/* Inflows */}
          <div className="glass-card p-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              30D Inflows
            </span>
            <div className="text-2xl font-black text-white">
              ₹{s.totalIncome30d?.toLocaleString('en-IN') || '0'}
            </div>
            <p className="text-[10px] text-slate-400">Monthly receipt volume</p>
          </div>

          {/* Goal Readiness */}
          <div className="glass-card p-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Goal Readiness
            </span>
            <div className="text-2xl font-black text-amber-400">
              {s.goalReadiness}%
            </div>
            <p className="text-[10px] text-slate-400">Target capital readiness</p>
          </div>
        </div>

        {/* Proof Strength Breakdown */}
        {s.proofStrength && (
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>Evidence Provenance Breakdown</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on {s.proofStrength.total} granular receipts, bills, and transaction proofs:
            </p>
            <ProvenanceBar proofStrength={s.proofStrength} />
          </div>
        )}

        {/* Verified Notice Footer */}
        <div className="text-center p-4 text-xs text-slate-500 space-y-1">
          <p>This is a verified read-only brief requested with explicit user consent.</p>
          <p>No raw banking credentials or unaggregated items are exposed.</p>
        </div>
      </div>
    </div>
  );
};
