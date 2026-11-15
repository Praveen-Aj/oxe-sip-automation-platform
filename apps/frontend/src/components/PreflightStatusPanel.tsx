import React from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'

export interface PreflightStatusPanelProps {
  isReady: boolean
  overallStatus: 'READY' | 'BLOCKED' | 'WARNING'
  totalChecks: number
  passedCount: number
  warningCount: number
  blockerCount: number
  onRevalidate: () => void
  onProceed?: () => void
  isValidating?: boolean
}

export const PreflightStatusPanel: React.FC<PreflightStatusPanelProps> = ({
  isReady,
  overallStatus,
  totalChecks,
  passedCount,
  warningCount,
  blockerCount,
  onRevalidate,
  onProceed,
  isValidating = false,
}) => {
  return (
    <Card
      className={`border transition-all ${
        isReady
          ? 'bg-emerald-950/20 border-emerald-800/80'
          : 'bg-rose-950/20 border-rose-800/80'
      }`}
    >
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-full border ${
              isReady
                ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                : 'bg-rose-950 border-rose-700 text-rose-400'
            }`}
          >
            {isReady ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-slate-100">
                {isReady ? 'READY FOR EXECUTION' : 'BLOCKED – RESOLVE VALIDATION ISSUES'}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isReady
                    ? 'bg-emerald-900/60 border border-emerald-600 text-emerald-300'
                    : 'bg-rose-900/60 border border-rose-600 text-rose-300'
                }`}
              >
                {overallStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Checks: <strong>{totalChecks}</strong> total • Passed: <strong className="text-emerald-400">{passedCount}</strong> • Warnings: <strong className="text-amber-400">{warningCount}</strong> • Blockers: <strong className="text-rose-400">{blockerCount}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRevalidate}
            disabled={isValidating}
            className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isValidating ? 'animate-spin' : ''}`} />
            Re-run Preflight
          </Button>

          {isReady && onProceed && (
            <Button
              variant="default"
              size="sm"
              onClick={onProceed}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Proceed to Execution
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
