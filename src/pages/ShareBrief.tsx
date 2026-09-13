import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  Copy,
  Check,
  Download,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  List,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvidence } from '../hooks/useEvidence';
import { useObligations } from '../hooks/useObligations';
import { useBriefs } from '../hooks/useBriefs';
import { useI18n } from '../lib/i18n';
import {
  classifyIncomeRhythm,
  computeBufferDays,
  computeProofStrength,
  computeGoalReadiness,
  computeFlows,
} from '../lib/computations';
import { downloadBriefPdf } from '../lib/pdfGenerator';
import type { BriefSnapshot } from '../types/database';

export const ShareBrief: React.FC = () => {
  const { profile } = useAuth();
  const { evidence } = useEvidence();
  const { obligations } = useObligations();
  const { generateBrief } = useBriefs();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Compute live snapshot state
  const rhythm = classifyIncomeRhythm(evidence);
  const buffer = computeBufferDays(evidence, obligations);
  const proof = computeProofStrength(evidence);
  const goalReadiness = computeGoalReadiness(evidence, profile?.goal || 'crop_input');
  const flows = computeFlows(evidence, 30);
  const upcomingObligationsTotal = obligations
    .filter((o) => new Date(o.due_date) >= new Date())
    .reduce((sum, o) => sum + o.amount, 0);

  const snapshotData: BriefSnapshot = {
    generatedAt: new Date().toISOString(),
    profileName: profile?.full_name || 'Micro-entrepreneur',
    incomeType: profile?.income_type || 'seasonal',
    goal: profile?.goal || 'crop_input',
    incomeRhythm: rhythm.value,
    bufferDays: buffer.value,
    proofStrength: proof.value,
    goalReadiness: goalReadiness.value,
    totalIncome30d: flows.inflows,
    totalExpenses30d: flows.outflows,
    obligationCount: obligations.length,
    obligationTotal: upcomingObligationsTotal,
    evidenceCount: evidence.length,
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const brief = await generateBrief(snapshotData, expiryDays);
    setGeneratedToken(brief.share_token);
    setGenerating(false);
  };

  const shareUrl = generatedToken
    ? `${window.location.origin}/brief/${generatedToken}`
    : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePdfDownload = async () => {
    if (!generatedToken) return;
    setDownloadingPdf(true);
    try {
      await downloadBriefPdf(snapshotData, generatedToken);
    } catch (err) {
      console.error('PDF error', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="page-container space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('share.title')}</h1>
          <p className="text-xs text-slate-400">{t('share.subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/my-shares')}
          className="btn-secondary !py-2 !px-3 !text-xs gap-1.5"
        >
          <List size={14} />
          <span>{t('share.manage')}</span>
        </button>
      </div>

      {/* Expiry Selector & Generate Trigger */}
      {!generatedToken ? (
        <div className="glass-card p-5 space-y-4 border-amber-500/20">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Generate Consent-Based Brief</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Create an aggregated snapshot of your financial resilience metrics without revealing private raw transaction details.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              {t('share.expiry')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[7, 15, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setExpiryDays(days)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    expiryDays === days
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-800/80 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {days} {t('share.expiry.days')}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="btn-primary w-full shadow-lg shadow-amber-500/20"
          >
            {generating ? (
              <div className="spinner" />
            ) : (
              <>
                <Share2 size={16} />
                <span>{t('share.generate')}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Generated Link & Actions */
        <div className="glass-card p-5 space-y-4 border-emerald-500/30 bg-emerald-500/5 animate-scale-in">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck size={16} />
            <span>Brief Snapshot Active & Valid</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Shareable Link:
            </span>
            <div className="text-xs font-mono text-amber-300 break-all select-all">
              {shareUrl}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-primary !text-xs !py-3 gap-1.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? t('share.copied') : t('share.copy')}</span>
            </button>

            <button
              type="button"
              disabled={downloadingPdf}
              onClick={handlePdfDownload}
              className="btn-secondary !text-xs !py-3 gap-1.5"
            >
              <Download size={14} className="text-amber-400" />
              <span>{downloadingPdf ? 'Preparing...' : t('share.download_pdf')}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <a
              href={`/brief/${generatedToken}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Preview Public View</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={() => setGeneratedToken(null)}
              className="text-slate-400 hover:text-white"
            >
              Create another
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Preview Card */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Included in Shared Snapshot
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5">
            <span className="text-slate-400 block text-[10px]">Buffer Days</span>
            <span className="font-bold text-emerald-400 text-sm">{buffer.value} Days</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5">
            <span className="text-slate-400 block text-[10px]">Income Rhythm</span>
            <span className="font-bold text-white text-sm capitalize">{rhythm.value}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5">
            <span className="text-slate-400 block text-[10px]">Inflows (30d)</span>
            <span className="font-bold text-white text-sm">₹{flows.inflows.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5">
            <span className="text-slate-400 block text-[10px]">Proof Strength</span>
            <span className="font-bold text-emerald-400 text-sm">
              {Math.round((proof.value.verified / (proof.value.total || 1)) * 100)}% Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
