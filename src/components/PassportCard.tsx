import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LucideIcon, Layers } from 'lucide-react';
import { ProvenanceBar } from './ProvenanceBar';
import { EvidenceCard } from './EvidenceCard';
import type { ProofStrength, EvidenceRecord } from '../types/database';

interface PassportCardProps {
  title: string;
  subtitle?: string;
  value: string | React.ReactNode;
  icon: LucideIcon;
  proofStrength?: ProofStrength;
  sourceEvidence?: EvidenceRecord[];
  badgeText?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'indigo';
}

export const PassportCard: React.FC<PassportCardProps> = ({
  title,
  subtitle,
  value,
  icon: Icon,
  proofStrength,
  sourceEvidence = [],
  badgeText,
  badgeColor = 'amber',
}) => {
  const [expanded, setExpanded] = useState(false);

  const badgeStyles = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  }[badgeColor];

  return (
    <div className="glass-card-hover p-5 space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Icon size={22} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {badgeText && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeStyles}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Main Value Display */}
      <div className="pt-1">
        {typeof value === 'string' ? (
          <div className="text-2xl font-extrabold text-white tracking-tight">{value}</div>
        ) : (
          value
        )}
      </div>

      {/* Provenance breakdown bar if supplied */}
      {proofStrength && (
        <div className="pt-2 border-t border-white/5">
          <ProvenanceBar proofStrength={proofStrength} />
        </div>
      )}

      {/* Traceability Drill-down Trigger */}
      {sourceEvidence.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300 py-1.5 px-2 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers size={14} />
              <span>Trace Source Evidence ({sourceEvidence.length} proofs)</span>
            </span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Expandable Source Evidence Cards */}
          {expanded && (
            <div className="mt-3 space-y-2.5 pt-2 border-t border-white/10 animate-fade-in">
              {sourceEvidence.map((rec) => (
                <EvidenceCard key={rec.id} record={rec} showRawText={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
