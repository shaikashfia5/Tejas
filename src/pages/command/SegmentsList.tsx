import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, MapPin } from 'lucide-react';
import { useCommand } from '../../hooks/useCommand';
import { scoreTier } from '../../lib/commandEngine';
import { CountUp } from '../../components/CountUp';
import { ListSkeleton } from '../../components/Skeletons';
import type { RankedSegment } from '../../types/command';

const tierStyles = {
  high: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
} as const;

const tierLabel = { high: 'High', medium: 'Medium', low: 'Low' } as const;
const tierFill = { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-emerald-500' } as const;

type TierFilter = 'all' | 'high' | 'medium' | 'low';

function Row({ item }: { item: RankedSegment }) {
  const tier = scoreTier(item.score);
  return (
    <Link
      to={`/command/segments/${item.segment.id}`}
      className="glass-card-hover p-4 flex items-center gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-slate-500 shrink-0" />
          <span className="font-bold text-white text-sm truncate">{item.segment.segment_name}</span>
          <span className="text-[11px] text-slate-400 truncate">
            {item.segment.district}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.recommendedAction}</p>
        {/* Live-computed ranking bar — fills from 0 on load */}
        <div className="score-bar mt-2">
          <div
            className={`score-bar-fill ${tierFill[tier]}`}
            style={{ width: `${Math.min(100, item.score)}%` }}
          />
        </div>
      </div>
      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${tierStyles[tier]}`}
      >
        {tierLabel[tier]}
      </span>
      <span className="text-base font-black text-white w-12 text-right shrink-0">
        <CountUp value={item.score} decimals={1} />
      </span>
      <ChevronRight size={16} className="text-slate-500 shrink-0" />
    </Link>
  );
}

export const SegmentsList: React.FC = () => {
  const { ranked, loading, isDemoData } = useCommand();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <ListSkeleton rows={6} />
      </div>
    );
  }

  const filtered = ranked.filter((r) => {
    const matchesTier = tier === 'all' || scoreTier(r.score) === tier;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      r.segment.segment_name.toLowerCase().includes(q) ||
      r.segment.district.toLowerCase().includes(q) ||
      r.segment.state.toLowerCase().includes(q);
    return matchesTier && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1">
        <h1 className="page-title">Segments</h1>
        <p className="text-xs text-slate-400">
          All tracked PMJDY segments{isDemoData && <b className="text-amber-400"> · Demo data</b>}
        </p>
      </div>

      {/* Search + tier filter */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search segment, district or state…"
          className="input-field pl-9"
          aria-label="Search segments"
        />
      </div>
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low'] as TierFilter[]).map((tt) => (
          <button
            key={tt}
            type="button"
            onClick={() => setTier(tt)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${
              tier === tt
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            {tt}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => (
          <Row key={item.segment.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">No segments match.</p>
        )}
      </div>
    </div>
  );
};
