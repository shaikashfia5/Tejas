import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Phone, MapPin, Zap, ClipboardList, Info } from 'lucide-react';
import { useCommand } from '../../hooks/useCommand';

const statusStyles: Record<string, string> = {
  activated: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  no_change: 'bg-slate-600/20 text-slate-300 border-white/10',
  follow_up_needed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const statusLabel: Record<string, string> = {
  activated: 'Activated',
  no_change: 'No change',
  follow_up_needed: 'Follow-up',
};

const actionIcon: Record<string, React.ElementType> = {
  visit: MapPin,
  call: Phone,
  tejas_field_session: Zap,
};

const actionLabel: Record<string, string> = {
  visit: 'Doorstep visit',
  call: 'Call',
  tejas_field_session: 'Tejas Field session',
};

const typeFilters = [
  { key: 'all', label: 'All' },
  { key: 'visit', label: 'Visits' },
  { key: 'call', label: 'Calls' },
  { key: 'tejas_field_session', label: 'Field sessions' },
  { key: 'activated', label: 'Activated only' },
] as const;

export const OutreachLogPage: React.FC = () => {
  const { outreach, isDemoData } = useCommand();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]['key']>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return outreach.filter((o) => {
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'activated'
          ? o.resulting_status === 'activated'
          : o.action_type === typeFilter);
      const matchesQuery =
        !q ||
        (o.segment_name ?? '').toLowerCase().includes(q) ||
        (o.district ?? '').toLowerCase().includes(q) ||
        o.bc_agent_name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [outreach, query, typeFilter]);

  const activationRate = outreach.length
    ? Math.round((outreach.filter((o) => o.resulting_status === 'activated').length / outreach.length) * 100)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="page-title flex items-center gap-2">
          <ClipboardList size={22} className="text-blue-400" />
          Outreach &amp; Accountability Log
        </h1>
        <p className="text-xs text-slate-400">
          Every BC action and its outcome — usage outcomes, not just enrollment
          counts.{isDemoData && <b className="text-amber-400"> Demo data.</b>}
        </p>
      </div>

      {/* Accountability explainer */}
      <div className="glass-card p-3.5 flex items-start gap-2.5 border-blue-500/20">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-300 leading-relaxed">
          <b className="text-white">Why this log exists:</b> account-activity
          outcomes from the field feed back into National Strategy for Financial
          Inclusion targets — implementers are measured on <b>usage</b>{' '}
          (activations), not enrollment. Current field activation rate:{' '}
          <b className="text-emerald-300">{activationRate}%</b>.
        </p>
      </div>

      {/* Filters */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search segment, district or agent…"
          className="input-field pl-9"
          aria-label="Search outreach log"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        {typeFilters.map((tf) => (
          <button
            key={tf.key}
            type="button"
            onClick={() => setTypeFilter(tf.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${
              typeFilter === tf.key
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-2.5">
        {filtered.map((o) => {
          const AIcon = actionIcon[o.action_type] ?? MapPin;
          const content = (
            <>
              <div className="p-2 rounded-lg bg-slate-800 border border-white/10 text-slate-300 shrink-0">
                <AIcon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{o.segment_name ?? 'Segment'}</span>
                  <span className="text-[11px] text-slate-400">{o.district}</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(o.date + 'T00:00:00').toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {o.bc_agent_name} · {actionLabel[o.action_type] ?? o.action_type}
                  {o.outcome_note ? ` — ${o.outcome_note}` : ''}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusStyles[o.resulting_status]}`}>
                {statusLabel[o.resulting_status] ?? o.resulting_status}
              </span>
            </>
          );

          return o.segment_id ? (
            <Link
              key={o.id}
              to={`/command/segments/${o.segment_id}`}
              className="glass-card-hover p-3.5 flex items-center gap-3"
            >
              {content}
            </Link>
          ) : (
            <div key={o.id} className="glass-card p-3.5 flex items-center gap-3">
              {content}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">No log entries match.</p>
        )}
      </div>
    </div>
  );
};
