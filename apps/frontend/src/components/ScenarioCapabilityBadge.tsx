import React from 'react'

export interface ScenarioCapabilityBadgeProps {
  type: 'UAC' | 'UAS' | 'REG' | 'AUTH' | 'PRACK' | 'MEDIA' | 'PUBLISH' | 'VALID' | 'WARNING' | 'INVALID'
  label?: string
}

export const ScenarioCapabilityBadge: React.FC<ScenarioCapabilityBadgeProps> = ({ type, label }) => {
  const styles: Record<string, string> = {
    UAC: 'bg-sky-950/70 border-sky-500/40 text-sky-400',
    UAS: 'bg-indigo-950/70 border-indigo-500/40 text-indigo-400',
    REG: 'bg-teal-950/70 border-teal-500/40 text-teal-400',
    AUTH: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
    PRACK: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
    MEDIA: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
    PUBLISH: 'bg-blue-950/70 border-blue-500/40 text-blue-300',
    VALID: 'bg-emerald-950/80 border-emerald-500 text-emerald-400',
    WARNING: 'bg-amber-950/80 border-amber-500 text-amber-400',
    INVALID: 'bg-rose-950/80 border-rose-500 text-rose-400',
  }

  const defaultLabels: Record<string, string> = {
    UAC: 'UAC',
    UAS: 'UAS',
    REG: 'REGISTER',
    AUTH: 'Auth (401/407)',
    PRACK: 'PRACK (100rel)',
    MEDIA: 'SDP Media',
    PUBLISH: 'PUBLISH',
    VALID: 'Schema Valid',
    WARNING: 'Warning',
    INVALID: 'Schema Invalid',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
        styles[type] || 'bg-slate-800 border-slate-700 text-slate-300'
      }`}
    >
      {label || defaultLabels[type] || type}
    </span>
  )
}
