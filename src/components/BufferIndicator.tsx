import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface BufferIndicatorProps {
  days: number;
  size?: 'sm' | 'md' | 'lg';
  showSubtext?: boolean;
}

export const BufferIndicator: React.FC<BufferIndicatorProps> = ({
  days,
  size = 'md',
  showSubtext = true,
}) => {
  const { t } = useI18n();

  // Status configuration
  type BufferTone = 'emerald' | 'amber' | 'rose';
  let tone: BufferTone = 'emerald';
  let statusText = 'Strong Resilience';
  let Icon = ShieldCheck;

  if (days < 7) {
    tone = 'rose';
    statusText = 'Critical Buffer';
    Icon = ShieldAlert;
  } else if (days < 30) {
    tone = 'amber';
    statusText = 'Moderate Buffer';
    Icon = Shield;
  }

  const colorStyles: Record<BufferTone, { text: string; bg: string; badge: string }> = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      badge: 'bg-emerald-500/20 text-emerald-300',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-300',
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      badge: 'bg-rose-500/20 text-rose-300',
    },
  };
  const styles = colorStyles[tone];

  return (
    <div className={`rounded-2xl p-4 border ${styles.bg} flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3.5">
        <div className={`p-3 rounded-xl ${styles.bg} ${styles.text}`}>
          <Icon size={size === 'lg' ? 32 : 24} />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={`font-extrabold tracking-tight ${size === 'lg' ? 'text-4xl' : 'text-3xl'} ${styles.text}`}>
              {days}
            </span>
            <span className="text-sm font-semibold text-slate-300">
              {t('passport.days')}
            </span>
          </div>
          {showSubtext && (
            <p className="text-xs text-slate-400 mt-0.5">
              Covers daily essential expenses
            </p>
          )}
        </div>
      </div>

      <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles.badge}`}>
        {statusText}
      </div>
    </div>
  );
};
