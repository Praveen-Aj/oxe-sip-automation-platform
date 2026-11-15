import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Shield, Radio, Activity, Terminal } from 'lucide-react'

export interface ConfigurationSummaryProps {
  scenarioName: string
  environmentName: string
  callerRange: string
  calledRange: string
  callRate: number
  callCount: number
  transport: string
  authEnabled: boolean
  prackEnabled: boolean
  estimatedDuration: string
}

export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  scenarioName,
  environmentName,
  callerRange,
  calledRange,
  callRate,
  callCount,
  transport,
  authEnabled,
  prackEnabled,
  estimatedDuration,
}) => {
  return (
    <Card className="bg-slate-900 border-slate-800 text-slate-100">
      <CardHeader className="py-3 px-4 border-b border-slate-800">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-400" /> Execution Configuration Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 font-mono text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Scenario Asset:</span>
            <span className="text-slate-200 font-semibold truncate block mt-0.5">{scenarioName}</span>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Target Environment:</span>
            <span className="text-slate-200 font-semibold truncate block mt-0.5">{environmentName}</span>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Dialplan Subscriber Range:</span>
            <span className="text-sky-400 font-semibold block mt-0.5">
              Caller: {callerRange} → Called: {calledRange}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Traffic Rate & Scaling:</span>
            <span className="text-emerald-400 font-semibold block mt-0.5">
              {callRate} CPS / {callCount} total calls (~{estimatedDuration})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
            Transport: <strong>{transport}</strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              authEnabled
                ? 'bg-purple-950/70 border-purple-800 text-purple-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            Digest Auth: <strong>{authEnabled ? 'Enabled' : 'Disabled'}</strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              prackEnabled
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            100rel PRACK: <strong>{prackEnabled ? 'Enabled' : 'Disabled'}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
