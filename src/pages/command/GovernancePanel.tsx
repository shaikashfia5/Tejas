import React from 'react';
import { ShieldCheck, Database, Lock, FileText, Landmark, Users, Receipt } from 'lucide-react';

const dataCategories = [
  {
    icon: Landmark,
    title: 'PMJDY account status',
    source: 'PMJDY (synthetic demo values)',
    purpose:
      'Dormancy counts per village/block segment — used only to rank where BC activation visits should go next.',
    consent:
      'Aggregated at segment level. No individual account holder is identified in Tejas Command.',
  },
  {
    icon: Receipt,
    title: 'DBT linkage status',
    source: 'DBT Mission (synthetic demo values)',
    purpose:
      'Flags benefits reaching linked but unused accounts — the sharpest access-without-usage signal.',
    consent:
      'Counts only. Benefit type and amount never leave government systems.',
  },
  {
    icon: Database,
    title: 'FI-Index access & usage rates',
    source: 'RBI FI-Index methodology (synthetic demo values)',
    purpose:
      'District-level access-vs-usage gap — the core problem this dashboard targets.',
    consent:
      'Published statistical aggregates; no personal data is processed.',
  },
  {
    icon: Users,
    title: 'NPCI channel usage',
    source: 'UPI / AePS rails (synthetic demo values)',
    purpose:
      'Distinguishes AePS-enabled from actively used accounts to pick the right intervention.',
    consent:
      'Channel-level counts only. Transaction contents are never accessed.',
  },
  {
    icon: FileText,
    title: 'Outreach outcomes',
    source: 'Tejas Field sessions (this product)',
    purpose:
      'BC agents record whether a visit activated the account — accountability for usage, not enrollment.',
    consent:
      'Recorded with agent consent; holders are identified only inside their own consented Field session.',
  },
];

const principles = [
  {
    icon: Lock,
    title: 'Purpose limitation',
    body: 'Command data is used exclusively to prioritize and evaluate inclusion outreach. It is never used for credit scoring, marketing, or sold to third parties.',
  },
  {
    icon: ShieldCheck,
    title: 'DPDP Act 2023 alignment',
    body: 'Segment aggregates are non-personal data. Any individual-level evidence exists only inside Tejas Field sessions, under the holder\'s explicit consent, and is removable on request.',
  },
  {
    icon: Database,
    title: 'Data minimization',
    body: 'Command consumes counts and rates already produced by existing government systems. It introduces no new data collection burden on citizens or BCs.',
  },
];

export const GovernancePanel: React.FC = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="page-title flex items-center gap-2">
          <ShieldCheck size={22} className="text-blue-400" />
          Data Governance
        </h1>
        <p className="text-xs text-slate-400">
          What data Tejas Command uses, why, and the consent basis for each
          category.
        </p>
      </div>

      {/* Demo data disclosure */}
      <div className="glass-card p-3.5 border-amber-500/25 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          Demonstration disclosure
        </p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          All PMJDY, DBT, FI-Index and NPCI figures shown in Tejas Command are{' '}
          <b className="text-white">synthetic demonstration values</b>. No live
          government API is connected. In production these tables would be
          populated through official data-sharing agreements, keeping this exact
          schema.
        </p>
      </div>

      {/* Data categories */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Data categories &amp; consent basis</h2>
        {dataCategories.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-blue-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{c.title}</div>
                  <div className="text-[11px] text-slate-500">{c.source}</div>
                </div>
              </div>
              <p className="text-xs text-slate-300">{c.purpose}</p>
              <p className="text-[11px] text-slate-400 border-l-2 border-blue-500/40 pl-2.5">
                <b className="text-slate-200">Consent / compliance:</b> {c.consent}
              </p>
            </div>
          );
        })}
      </div>

      {/* Principles */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Governing principles</h2>
        {principles.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="glass-card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">{p.title}</div>
                <p className="text-xs text-slate-300 mt-0.5">{p.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
