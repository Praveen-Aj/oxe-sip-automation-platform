import React from 'react';

export interface StatusBadgeProps {
  status: 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED' | 'OFFLINE';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const styles = {
    READY: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400',
    RUNNING: 'bg-blue-950/70 border-blue-500/40 text-blue-400 animate-pulse',
    COMPLETED: 'bg-slate-800 border-slate-700 text-slate-200',
    FAILED: 'bg-rose-950/70 border-rose-500/40 text-rose-400',
    ABORTED: 'bg-amber-950/70 border-amber-500/40 text-amber-400',
    OFFLINE: 'bg-slate-900 border-slate-800 text-slate-500',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${styles[status]}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {label || status}
    </span>
  );
};
