import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  variant = 'default',
  icon
}) => {
  const borderVariants = {
    default: 'border-slate-800 text-slate-100',
    success: 'border-emerald-500/30 text-emerald-400',
    warning: 'border-amber-500/30 text-amber-400',
    danger: 'border-rose-500/30 text-rose-400',
    accent: 'border-cyan-500/30 text-cyan-400'
  };

  return (
    <div className={cn(
      "bg-slate-900 border rounded-lg p-4 shadow-sm transition-all flex flex-col justify-between",
      borderVariants[variant]
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};
