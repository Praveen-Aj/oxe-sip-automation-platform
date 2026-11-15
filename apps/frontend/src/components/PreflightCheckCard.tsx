import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronRight } from 'lucide-react'

export interface PreflightCheckItem {
  category: string
  name: string
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIPPED' | 'NOT_APPLICABLE'
  is_blocker: boolean
  message: string
  remediation?: string
  details?: Record<string, any>
}

export interface PreflightCheckCardProps {
  check: PreflightCheckItem
}

export const PreflightCheckCard: React.FC<PreflightCheckCardProps> = ({ check }) => {
  const isPass = check.status === 'PASS'
  const isWarning = check.status === 'WARNING'
  const isFail = check.status === 'FAIL'

  const borderStyles = isPass
    ? 'border-slate-800/80 bg-slate-950/40'
    : isWarning
    ? 'border-amber-900/60 bg-amber-950/20'
    : 'border-rose-900/60 bg-rose-950/20'

  return (
    <div className={`p-3 rounded-lg border transition-all text-xs font-mono ${borderStyles}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {isPass && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
          {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
          {isFail && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold font-sans text-slate-200">{check.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">[{check.category}]</span>
              {check.is_blocker && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                  BLOCKER
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{check.message}</p>
            {check.remediation && (
              <div className="mt-2 p-2 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-amber-300/90 flex items-start gap-1 font-sans">
                <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Remediation:</strong> {check.remediation}
                </span>
              </div>
            )}
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
            isPass
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
              : isWarning
              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
              : 'bg-rose-950 text-rose-400 border border-rose-800/60'
          }`}
        >
          {check.status}
        </span>
      </div>
    </div>
  )
}
