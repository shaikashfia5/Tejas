import React, { useState } from 'react';
import {
  Zap,
  Activity,
  Play,
  RotateCcw,
  History,
  Clock,
  Sparkles,
  AlertOctagon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEvidence } from '../hooks/useEvidence';
import { useObligations } from '../hooks/useObligations';
import { useShockSim } from '../hooks/useShockSim';
import { useI18n } from '../lib/i18n';
import { simulateShock } from '../lib/computations';
import { ShockResult } from '../components/ShockResult';
import type { ShockType, ShockResult as ShockResultType } from '../types/database';

export const ShockSimulator: React.FC = () => {
  const { user } = useAuth();
  const { evidence } = useEvidence();
  const { obligations } = useObligations();
  const { history, saveScenario } = useShockSim();
  const { t } = useI18n();

  const [shockType, setShockType] = useState<ShockType>('delayed_payment');
  const [shockAmount, setShockAmount] = useState<number | ''>(15000);
  const [shockDate, setShockDate] = useState<string>(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [simulationResult, setSimulationResult] = useState<ShockResultType | null>(null);

  const shockOptions: { id: ShockType; label: string; defaultAmt: number; desc: string }[] = [
    {
      id: 'delayed_payment',
      label: t('shock.type.delayed_payment'),
      defaultAmt: 15000,
      desc: 'Buyer/Mandi payment postponed by 30-45 days',
    },
    {
      id: 'medical_expense',
      label: t('shock.type.medical_expense'),
      defaultAmt: 12000,
      desc: 'Sudden family health emergency / hospitalization',
    },
    {
      id: 'fee_deadline',
      label: t('shock.type.fee_deadline'),
      defaultAmt: 8000,
      desc: 'School or institute annual term fee due immediately',
    },
    {
      id: 'supplier_payment',
      label: t('shock.type.supplier_payment'),
      defaultAmt: 20000,
      desc: 'Bulk inventory / seed supplier demand for advance',
    },
  ];

  const handleSelectScenario = (type: ShockType) => {
    setShockType(type);
    const found = shockOptions.find((o) => o.id === type);
    if (found) setShockAmount(found.defaultAmt);
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shockAmount || Number(shockAmount) <= 0) return;

    const result = simulateShock(evidence, obligations, {
      type: shockType,
      amount: Number(shockAmount),
      date: shockDate,
    });

    setSimulationResult(result.value);

    // Persist scenario to history
    if (user) {
      await saveScenario({
        user_id: user.id,
        scenario_type: shockType,
        shock_amount: Number(shockAmount),
        resulting_shortfall_date: result.value.shortfallDate,
        resulting_gap_amount: result.value.gapAmount,
      });
    }
  };

  return (
    <div className="page-container space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">{t('shock.title')}</h1>
        <p className="text-xs text-slate-400">{t('shock.subtitle')}</p>
      </div>

      {/* Preset Scenario Selector Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {shockOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelectScenario(opt.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              shockType === opt.id
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                : 'bg-slate-800/80 border-white/5 text-slate-400 hover:border-white/20'
            }`}
          >
            <h4 className="text-xs font-bold text-white mb-0.5">{opt.label}</h4>
            <p className="text-[10px] text-slate-400 leading-tight truncate">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Scenario Parameters Form */}
      <form onSubmit={handleRunSimulation} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-amber-400" />
          <span>Simulation Parameters (शॉक इनपुट)</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t('shock.amount')}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">
              ₹
            </span>
            <input
              type="number"
              required
              min="500"
              value={shockAmount}
              onChange={(e) => setShockAmount(Number(e.target.value) || '')}
              className="input-field !pl-8 text-lg font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t('shock.date')}
          </label>
          <input
            type="date"
            required
            value={shockDate}
            onChange={(e) => setShockDate(e.target.value)}
            className="input-field text-sm"
          />
        </div>

        <button type="submit" className="btn-primary w-full shadow-lg shadow-amber-500/20">
          <Play size={16} />
          <span>{t('shock.simulate')}</span>
        </button>
      </form>

      {/* Dynamic Simulation Result */}
      {simulationResult && (
        <ShockResult
          result={simulationResult}
          shockAmount={Number(shockAmount) || 0}
        />
      )}

      {/* History of Past Simulations */}
      {history.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History size={14} />
            <span>{t('shock.history')}</span>
          </h3>

          <div className="space-y-2">
            {history.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white block capitalize">
                    {item.scenario_type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-200 block">
                    -₹{item.shock_amount.toLocaleString('en-IN')}
                  </span>
                  {item.resulting_shortfall_date ? (
                    <span className="text-[10px] text-rose-400 font-bold">
                      Gap: ₹{item.resulting_gap_amount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Absorbed Safe
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
