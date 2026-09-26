import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  UserX,
  Unlink,
  BarChart3,
  UserPlus,
  LineChart as LineChartIcon,
  Phone,
  MapPin,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useCommand } from '../../hooks/useCommand';
import { scoreTier } from '../../lib/commandEngine';

const tierStyles = {
  high: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
} as const;

const tierLabel = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' } as const;

const statusStyles: Record<string, string> = {
  activated: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  no_change: 'bg-slate-600/20 text-slate-300 border-white/10',
  follow_up_needed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const statusLabel: Record<string, string> = {
  activated: 'Activated',
  no_change: 'No change',
  follow_up_needed: 'Follow-up needed',
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

export const SegmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ranked, outreach, agents, isDemoData, assignAgent } = useCommand();
  const [assigning, setAssigning] = useState(false);
  const [assignNote, setAssignNote] = useState<string | null>(null);

  const item = ranked.find((r) => r.segment.id === id);

  if (!item) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-slate-400">Segment not found.</p>
        <Link to="/command/segments" className="text-amber-400 text-sm font-medium">
          ← Back to segments
        </Link>
      </div>
    );
  }

  const tier = scoreTier(item.score);
  const segOutreach = outreach.filter((o) => o.segment_id === item.segment.id);
  const fi = item.fi;

  const handleAssign = async (agentName: string) => {
    setAssigning(false);
    const res = await assignAgent(item.segment.id, { id: '', full_name: agentName });
    setAssignNote(res.error ? `Error: ${res.error}` : `Assigned to ${agentName} — visit logged for follow-up.`);
  };

  const trendData = item.trend.map((t) => ({
    label: new Date(t.month + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' }),
    dormancy: Math.round(t.dormancyRate * 1000) / 10,
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate('/command/segments')}
          className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
          aria-label="Back to segments"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="page-title truncate">{item.segment.segment_name}</h1>
          <p className="text-xs text-slate-400">
            {item.segment.district}, {item.segment.state}
            {isDemoData && <b className="text-amber-400"> · Demo data</b>}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierStyles[tier]}`}>
            {tierLabel[tier]}
          </span>
          <div className="text-2xl font-black text-white mt-1">{item.score.toFixed(1)}</div>
        </div>
      </div>

      {/* Dominant driver (explainability) */}
      <div className="glass-card p-4 space-y-1.5 border-amber-500/20">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          Primary driver
        </div>
        <p className="text-sm text-white font-medium">{item.primaryDriver}</p>
        <p className="text-[11px] text-slate-400">
          Recommended action: {item.recommendedAction}
        </p>
      </div>

      {/* The three underlying signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <UserX size={14} className="text-rose-400" /> Dormancy rate
          </div>
          <div className="text-xl font-black text-white">
            {(item.dormancyRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400">
            {item.segment.dormant_accounts.toLocaleString('en-IN')} of{' '}
            {item.segment.total_accounts.toLocaleString('en-IN')} accounts
          </div>
        </div>
        <div className="glass-card p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Unlink size={14} className="text-amber-400" /> DBT-linked but dormant
          </div>
          <div className="text-xl font-black text-white">
            {(item.dbtWasteRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400">
            {item.segment.dbt_linked_but_dormant.toLocaleString('en-IN')} of{' '}
            {item.segment.dbt_linked_accounts.toLocaleString('en-IN')} DBT-linked
          </div>
        </div>
        <div className="glass-card p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <BarChart3 size={14} className="text-blue-400" /> Access-usage gap
          </div>
          <div className="text-xl font-black text-white">
            {item.accessUsageGap.toFixed(1)} pt
          </div>
          <div className="text-[11px] text-slate-400">
            {fi ? `${fi.access_rate}% access vs ${fi.usage_rate}% usage (FI-Index)` : 'No FI-Index row'}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <LineChartIcon size={14} className="text-blue-400" /> Dormancy trend (6 months)
        </div>
        {trendData.length >= 2 ? (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, 'Dormancy']}
                />
                <Line type="monotone" dataKey="dormancy" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Not enough snapshot data for a trend.</p>
        )}
      </div>

      {/* Assign action */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <UserPlus size={14} className="text-emerald-400" /> Assign BC agent
        </div>
        {assignNote && (
          <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5">
            {assignNote}
          </p>
        )}
        {!assigning ? (
          <button type="button" onClick={() => setAssigning(true)} className="btn-primary w-full">
            <UserPlus size={16} />
            <span>Assign a BC agent for activation visit</span>
          </button>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <button
                key={a.id || a.full_name}
                type="button"
                onClick={() => handleAssign(a.full_name)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-slate-200 hover:border-amber-500/40 hover:text-white transition-colors flex items-center justify-between"
              >
                <span className="font-medium">{a.full_name}</span>
                <span className="text-[11px] text-slate-500">BC Sakhi</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAssigning(false)}
              className="w-full text-center text-xs text-slate-400 py-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Past outreach */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <ClipboardIcon /> Past outreach ({segOutreach.length})
        </div>
        {segOutreach.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No outreach attempts logged yet.</p>
        ) : (
          <div className="space-y-2.5">
            {segOutreach.map((o) => {
              const AIcon = actionIcon[o.action_type] ?? MapPin;
              return (
                <div key={o.id} className="flex items-start gap-2.5 text-xs">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 shrink-0">
                    <AIcon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{o.bc_agent_name}</span>
                      <span className="text-slate-400">{actionLabel[o.action_type] ?? o.action_type}</span>
                      <span className="text-slate-500">
                        {new Date(o.date + 'T00:00:00').toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    {o.outcome_note && <p className="text-slate-400 mt-0.5">{o.outcome_note}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusStyles[o.resulting_status]}`}>
                    {statusLabel[o.resulting_status] ?? o.resulting_status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function ClipboardIcon() {
  return <ClipboardListGlyph />;
}

function ClipboardListGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}
