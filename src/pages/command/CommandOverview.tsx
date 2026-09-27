import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  UserX,
  Unlink,
  CheckCircle2,
  ChevronRight,
  Radar,
  Info,
} from 'lucide-react';
import { useCommand } from '../../hooks/useCommand';
import { scoreTier } from '../../lib/commandEngine';
import { CountUp } from '../../components/CountUp';
import { StatsSkeleton, ListSkeleton } from '../../components/Skeletons';
import type { RankedSegment } from '../../types/command';

const tierStyles = {
  high: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
} as const;

const tierLabel = { high: 'High', medium: 'Medium', low: 'Low' } as const;
const tierFill = { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-emerald-500' } as const;

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <Icon size={14} className={tone} />
        {label}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function SegmentRow({ item, rank }: { item: RankedSegment; rank: number }) {
  const tier = scoreTier(item.score);
  return (
    <Link
      to={`/command/segments/${item.segment.id}`}
      className="glass-card-hover p-4 flex items-center gap-3 block"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-black text-slate-300 shrink-0">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-sm truncate">{item.segment.segment_name}</span>
          <span className="text-[11px] text-slate-400">
            {item.segment.district}, {item.segment.state}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.primaryDriver}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-300">
          <span>
            Dormancy <b className="text-white">{Math.round(item.dormancyRate * 100)}%</b>
          </span>
          <span>
            DBT waste <b className="text-white">{Math.round(item.dbtWasteRate * 100)}%</b>
          </span>
          <span>
            Gap <b className="text-white">{item.accessUsageGap.toFixed(1)} pt</b>
          </span>
        </div>
        {/* Live-computed ranking bar — fills from 0 on load */}
        <div className="score-bar mt-2">
          <div
            className={`score-bar-fill ${tierFill[tier]}`}
            style={{ width: `${Math.min(100, item.score)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierStyles[tier]}`}
        >
          {tierLabel[tier]}
        </span>
        <span className="text-lg font-black text-white">
          <CountUp value={item.score} decimals={1} />
        </span>
      </div>
      <ChevronRight size={16} className="text-slate-500 shrink-0" />
    </Link>
  );
}

export const CommandOverview: React.FC = () => {
  const { ranked, summary, loading, isDemoData, refresh } = useCommand();

  if (loading) {
    return (
      <div className="space-y-5 py-4">
        <StatsSkeleton />
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="page-title flex items-center gap-2">
          <Radar size={22} className="text-blue-400" />
          Tejas Command
        </h1>
        <p className="text-xs text-slate-400">
          Data-driven targeting for dormant PMJDY accounts — decide which
          segments your BC agents visit next, using existing government
          signals. {isDemoData && <b className="text-amber-400">Demo data.</b>}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MapPin} label="Segments tracked" value={<CountUp value={summary.totalSegments} />} tone="text-blue-400" />
        <StatCard icon={UserX} label="Dormant accounts" value={<CountUp value={summary.totalDormant} />} tone="text-rose-400" />
        <StatCard icon={Unlink} label="Access-usage gap" value={<CountUp value={summary.avgAccessUsageGap} decimals={1} suffix=" pt" />} tone="text-amber-400" />
        <StatCard icon={CheckCircle2} label="Activated this month" value={<CountUp value={summary.activatedThisMonth} />} tone="text-emerald-400" />
      </div>

      {/* Methodology note (explainability) */}
      <div className="glass-card p-3.5 flex items-start gap-2.5 border-blue-500/20">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-300 leading-relaxed">
          <b className="text-white">How priority is computed:</b> equal weight
          to dormancy rate, DBT-linked-but-dormant rate, and the district
          FI-Index access−usage gap. The dominant signal is shown for every
          segment — no black-box rankings.
        </p>
      </div>

      {/* Ranked table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Priority-ranked segments</h2>
          <button
            type="button"
            onClick={refresh}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
          >
            Refresh
          </button>
        </div>
        {ranked.map((item, i) => (
          <SegmentRow key={item.segment.id} item={item} rank={i + 1} />
        ))}
      </div>
    </div>
  );
};
