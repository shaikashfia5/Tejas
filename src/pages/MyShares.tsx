import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ShieldCheck,
  ShieldX,
  ExternalLink,
  Trash2,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { useBriefs } from '../hooks/useBriefs';
import { useI18n } from '../lib/i18n';

export const MyShares: React.FC = () => {
  const { briefs, revokeBrief } = useBriefs();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="page-container space-y-5 animate-fade-in">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/share')}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{t('share.my_shares')}</h1>
            <p className="text-xs text-slate-400">Manage consent and active access</p>
          </div>
        </div>
      </div>

      {/* Briefs List */}
      <div className="space-y-3">
        {briefs.length === 0 ? (
          <div className="glass-card text-center py-12 px-4 space-y-3">
            <p className="text-xs text-slate-400 italic">{t('share.no_shares')}</p>
            <button
              type="button"
              onClick={() => navigate('/share')}
              className="btn-primary !text-xs !py-2.5"
            >
              Generate your first brief
            </button>
          </div>
        ) : (
          briefs.map((b) => {
            const isExpired = new Date(b.expiry_date) < new Date();
            const isActive = !b.revoked && !isExpired;

            return (
              <div
                key={b.id}
                className={`glass-card p-4 space-y-3 border transition-all ${
                  isActive
                    ? 'border-emerald-500/30'
                    : 'border-white/5 opacity-75 bg-slate-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-400 font-bold">
                        {b.share_token}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : b.revoked
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        }`}
                      >
                        {isActive
                          ? t('share.active')
                          : b.revoked
                          ? t('share.revoked')
                          : t('share.expired')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>
                        Expires: {new Date(b.expiry_date).toLocaleDateString('en-IN')}
                      </span>
                    </p>
                  </div>

                  {isActive && (
                    <button
                      type="button"
                      onClick={() => revokeBrief(b.id)}
                      className="btn-danger !py-1.5 !px-3 !text-xs gap-1"
                    >
                      <Trash2 size={12} />
                      <span>{t('share.revoke')}</span>
                    </button>
                  )}
                </div>

                {/* Key Metric Highlights */}
                {b.snapshot_data && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <span className="text-slate-400 block text-[9px]">Buffer</span>
                      <span className="font-bold text-white">
                        {b.snapshot_data.bufferDays} Days
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <span className="text-slate-400 block text-[9px]">Inflows</span>
                      <span className="font-bold text-white">
                        ₹{b.snapshot_data.totalIncome30d?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <span className="text-slate-400 block text-[9px]">Goal</span>
                      <span className="font-bold text-amber-300">
                        {b.snapshot_data.goalReadiness}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Link Preview if active */}
                {isActive && (
                  <div className="pt-1 text-right">
                    <a
                      href={`/brief/${b.share_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Brief Link</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
