import React from 'react';

export interface ResponseDistributionProps {
  distribution: Record<string, number>;
}

export const ResponseDistribution: React.FC<ResponseDistributionProps> = ({ distribution }) => {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex justify-between">
        <span>SIP Response Distribution</span>
        <span className="text-slate-300 font-bold">{total} Total Events</span>
      </div>
      <div className="space-y-2">
        {Object.entries(distribution).map(([label, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          let barColor = 'bg-blue-500';
          if (label.includes('200')) barColor = 'bg-emerald-500';
          if (label.includes('401') || label.includes('407')) barColor = 'bg-purple-500';
          if (label.includes('Error')) barColor = 'bg-rose-500';

          return (
            <div key={label} className="text-xs">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>{label}</span>
                <span className="text-slate-400">{count} ({pct}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
