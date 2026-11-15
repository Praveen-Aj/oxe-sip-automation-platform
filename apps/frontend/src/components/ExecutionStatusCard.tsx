import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Play, Square, Activity, ShieldAlert, Cpu } from 'lucide-react'

export interface ExecutionStatusCardProps {
  executionId: string
  mode: 'SIMULATED' | 'PHYSICAL'
  state: string
  environmentName: string
  scenarioName: string
  callRate: number
  callCount: number
  durationSeconds: number
  onStop?: () => void
  isStopping?: boolean
}

export const ExecutionStatusCard: React.FC<ExecutionStatusCardProps> = ({
  executionId,
  mode,
  state,
  environmentName,
  scenarioName,
  callRate,
  callCount,
  durationSeconds,
  onStop,
  isStopping = false,
}) => {
  const isRunning = state === 'RUNNING' || state === 'STARTING_CALLER' || state === 'STARTING_CALLED'
  const isCompleted = state === 'COMPLETED'
  const isCancelled = state === 'CANCELLED' || state === 'FAILED'

  return (
    <Card className="bg-slate-900 border-slate-800 text-slate-100">
      <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className={`w-4 h-4 ${isRunning ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
          <CardTitle className="text-sm font-semibold tracking-tight">
            Execution {executionId}
          </CardTitle>
          <Badge
            variant="outline"
            className={`font-mono text-[10px] uppercase ${
              mode === 'SIMULATED'
                ? 'bg-sky-950/70 border-sky-600 text-sky-300'
                : 'bg-purple-950/70 border-purple-600 text-purple-300'
            }`}
          >
            {mode} MODE
          </Badge>
          <Badge
            variant="outline"
            className={`font-mono text-[10px] uppercase ${
              isRunning
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 animate-pulse'
                : isCompleted
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-rose-950/70 border-rose-600 text-rose-300'
            }`}
          >
            {state}
          </Badge>
        </div>

        {isRunning && onStop && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            disabled={isStopping}
            className="h-7 text-xs bg-rose-600 hover:bg-rose-500 gap-1.5"
          >
            <Square className="w-3 h-3" /> Stop Test
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <div className="text-slate-500">Environment</div>
          <div className="text-slate-200 font-semibold truncate">{environmentName}</div>
        </div>
        <div>
          <div className="text-slate-500">Scenario</div>
          <div className="text-slate-200 font-semibold truncate">{scenarioName}</div>
        </div>
        <div>
          <div className="text-slate-500">Target CPS / Limit</div>
          <div className="text-slate-200 font-semibold">{callRate} CPS / {callCount} calls</div>
        </div>
        <div>
          <div className="text-slate-500">Elapsed Duration</div>
          <div className="text-slate-200 font-semibold">{durationSeconds}s</div>
        </div>
      </CardContent>
    </Card>
  )
}
