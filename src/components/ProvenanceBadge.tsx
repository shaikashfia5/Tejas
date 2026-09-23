import React from 'react';
import { CheckCircle2, FileText, HelpCircle } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { ProvenanceLabel } from '../types/database';

interface ProvenanceBadgeProps {
  label: ProvenanceLabel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  label,
  size = 'md',
  showIcon = true,
}) => {
  const { t } = useI18n();

  const config = {
    verified: {
      text: t('provenance.verified'),
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      dot: 'bg-emerald-400',
    },
    declared: {
      text: t('provenance.declared'),
      bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      icon: FileText,
      dot: 'bg-blue-400',
    },
    estimated: {
      text: t('provenance.estimated'),
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: HelpCircle,
      dot: 'bg-amber-400',
    },
  }[label] || {
    text: label,
    bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: HelpCircle,
    dot: 'bg-slate-400',
  };

  const IconComponent = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = { sm: 12, md: 14, lg: 16 }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm transition-transform active:scale-95 ${config.bg} ${sizeClasses}`}
    >
      {showIcon && <IconComponent size={iconSizes} className="shrink-0" />}
      <span>{config.text}</span>
    </span>
  );
};
