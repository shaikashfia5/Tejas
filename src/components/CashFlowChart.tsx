import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

interface MonthlyDataPoint {
  month: string;
  label: string;
  income: number;
  expenses: number;
  verified: number;
  declared: number;
  estimated: number;
}

interface CashFlowChartProps {
  data: MonthlyDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-white/15 p-3 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-1 z-50">
        <p className="font-bold text-slate-200 text-sm border-b border-white/10 pb-1 mb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-semibold text-white">
              ₹{entry.value?.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
        No monthly transaction data available yet
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
            formatter={(value) => (
              <span className="text-slate-300 font-medium capitalize">{value}</span>
            )}
          />
          <Bar dataKey="income" name="Money In (आवक)" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expenses" name="Money Out (जावक)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
