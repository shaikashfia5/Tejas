import React from 'react';
import type { ProofStrength } from '../types/database';

interface ProvenanceBarProps {
  proofStrength: ProofStrength;
  showLabels?: boolean;
  height?: string;
}

export const ProvenanceBar: React.FC<ProvenanceBarProps> = ({
  proofStrength,
  showLabels = true,
  height = 'h-2.5',
}) => {
  const total = proofStrength.total || 1;
  const verifiedPct = Math.round((proofStrength.verified / total) * 100);
  const declaredPct = Math.round((proofStrength.declared / total) * 100);
  const estimatedPct = Math.round((proofStrength.estimated / total) * 100);

  return (
    <div className="w-full space-y-1.5">
      <div className={`w-full ${height} bg-slate-800 rounded-full overflow-hidden flex border border-white/5`}>
        {verifiedPct > 0 && (
          <div
            style={{ width: `${verifiedPct}%` }}
            className="bg-emerald-500 transition-all duration-500 relative group"
            title={`Verified: ${verifiedPct}% (${proofStrength.verified})`}
          />
        )}
        {declaredPct > 0 && (
          <div
            style={{ width: `${declaredPct}%` }}
            className="bg-blue-500 transition-all duration-500 relative group"
            title={`Declared: ${declaredPct}% (${proofStrength.declared})`}
          />
        )}
        {estimatedPct > 0 && (
          <div
            style={{ width: `${estimatedPct}%` }}
            className="bg-amber-500 transition-all duration-500 relative group"
            title={`Estimated: ${estimatedPct}% (${proofStrength.estimated})`}
          />
        )}
      </div>

      {showLabels && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>{verifiedPct}% Verified</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span>{declaredPct}% Declared</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>{estimatedPct}% Estimated</span>
          </span>
        </div>
      )}
    </div>
  );
};
