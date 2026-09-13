import React from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Calendar, Info } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { ShockResult as ShockResultType } from '../types/database';

interface ShockResultProps {
  result: ShockResultType;
  shockAmount: number;
}

export const ShockResult: React.FC<ShockResultProps> = ({ result, shockAmount }) => {
  const { t } = useI18n();
  const hasShortfall = result.shortfallDate !== null;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Buffer Comparison Card */}
      <div className="glass-card p-5 border-white/15 space-y-4">
        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span>Buffer Comparison (शॉक प्रभाव)</span>
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">
              {t('shock.result.before')}
            </span>
            <span className="text-2xl font-bold text-white">
              {result.originalBufferDays}{' '}
              <span className="text-xs font-normal text-slate-400">
                {t('shock.result.days')}
              </span>
            </span>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              result.newBufferDays > 7
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <span className="text-xs text-slate-400 block mb-1">
              {t('shock.result.after')}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-2xl font-bold ${
                  result.newBufferDays > 7 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.newBufferDays}
              </span>
              <span className="text-xs font-normal text-slate-400">
                {t('shock.result.days')}
              </span>
            </div>
          </div>
        </div>

        {/* Shortfall Alert or Safe Banner */}
        {hasShortfall ? (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
              <AlertTriangle size={18} className="shrink-0 text-rose-400" />
              <span>Projected Liquidity Gap: ₹{result.gapAmount.toLocaleString('en-IN')}</span>
            </div>
            <p className="flex items-center gap-1.5 text-rose-200">
              <Calendar size={14} />
              Estimated Shortfall Date:{' '}
              <strong className="underline">{result.shortfallDate}</strong>
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle size={18} className="shrink-0 text-emerald-400" />
            <span>{t('shock.result.none')}</span>
          </div>
        )}

        {/* Guidance Suggestion */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
          <Info size={16} className="shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong className="block text-amber-300 font-semibold mb-0.5">
              Community Continuity Advisory
            </strong>
            {result.suggestion}
          </div>
        </div>
      </div>
    </div>
  );
};
