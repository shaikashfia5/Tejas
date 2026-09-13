import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Camera, PenTool, Trash2 } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { useI18n } from '../lib/i18n';
import type { EvidenceRecord } from '../types/database';

interface EvidenceCardProps {
  record: EvidenceRecord;
  onDelete?: (id: string) => void;
  showRawText?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  record,
  onDelete,
  showRawText = false,
}) => {
  const { t } = useI18n();
  const isIncome = record.direction === 'in';

  const formattedDate = new Date(record.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const categoryLabel = t(`category.${record.category}`);

  return (
    <div className="glass-card-hover p-4 relative group">
      <div className="flex items-start justify-between gap-3">
        {/* Direction & Category Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isIncome
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white text-base leading-tight">
                {categoryLabel}
              </h4>
              <span className="text-slate-500 text-xs">
                {record.type === 'image' ? (
                  <Camera size={13} className="inline text-slate-400" title="Scanned Receipt" />
                ) : (
                  <PenTool size={13} className="inline text-slate-400" title="Manual Entry" />
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Amount & Provenance Badge */}
        <div className="text-right">
          <div
            className={`font-bold text-lg leading-tight ${
              isIncome ? 'text-emerald-400' : 'text-slate-200'
            }`}
          >
            {isIncome ? '+' : '-'}₹{record.amount.toLocaleString('en-IN')}
          </div>
          <div className="mt-1">
            <ProvenanceBadge label={record.provenance_label} size="sm" />
          </div>
        </div>
      </div>

      {/* Raw extracted text excerpt if present */}
      {(showRawText || record.raw_text) && record.raw_text && (
        <div className="mt-3 pt-2.5 border-t border-white/5 text-xs text-slate-400 bg-slate-900/40 p-2.5 rounded-lg font-mono break-words leading-relaxed">
          <span className="text-amber-400/80 font-sans text-[10px] font-semibold block uppercase tracking-wider mb-0.5">
            Document Evidence / Text Proof:
          </span>
          {record.raw_text}
        </div>
      )}

      {/* Delete + image thumbnail if stored */}
      {record.image_url && (
        <div className="mt-2">
          <img src={record.image_url} alt="receipt" className="w-full max-h-32 object-contain rounded-lg border border-white/10 bg-slate-900" loading="lazy" />
        </div>
      )}
      {/* Delete Action if handler provided - always visible on touch, hover on desktop */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(record.id)}
          className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 border border-rose-500/20"
          title="Delete entry"
          aria-label="Delete entry"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};
