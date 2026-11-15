import React, { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { PlayCircle, ShieldCheck, AlertTriangle, ArrowRight, RotateCw, CheckCircle2 } from 'lucide-react'

export interface TestExecutionViewProps {
  initialEnvironmentId?: string
  initialScenarioId?: string
  initialConfigurationId?: string
  onNavigate?: (pageId: string, context?: any) => void
}

export function TestExecutionView({
  initialEnvironmentId,
  initialScenarioId,
  initialConfigurationId,
  onNavigate,
}: TestExecutionViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [environmentId, setEnvironmentId] = useState(initialEnvironmentId || 'env-local-simulation')
  const [scenarioId, setScenarioId] = useState(initialScenarioId || 'invite-caller-auth-prack')
  const [configurationId, setConfigurationId] = useState(initialConfigurationId)
  const [mode, setMode] = useState<'SIMULATED' | 'PHYSICAL'>('SIMULATED')
  const [confirmPhysical, setConfirmPhysical] = useState(false)
  const [callRate, setCallRate] = useState(15.0)
  const [callCount, setCallCount] = useState(50)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const handleLaunch = async () => {
    setIsLaunching(true)
    setLaunchError(null)

    if (mode === 'PHYSICAL' && !confirmPhysical) {
      setLaunchError('Physical execution requires explicit operator authorization check.')
      setIsLaunching(false)
      return
    }

    try {
      const payload = {
        environment_id: environmentId,
        scenario_id: scenarioId,
        configuration_id: configurationId,
        mode: mode,
        confirm_physical_execution: confirmPhysical,
        call_rate: callRate,
        call_count: callCount,
      }

      const res = await fetch(apiUrl('/api/v1/executions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        if (onNavigate) {
          onNavigate('monitor', { executionId: data.id })
        }
      } else {
        const err = await res.json()
        setLaunchError(err.detail || 'Failed to start execution.')
      }
    } catch (e: any) {
      setLaunchError(e.message || 'Offline error launching execution.')
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-sky-400" />
            Execution Launch Control
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review preflight readiness, select mode, confirm safety gates, and launch distributed SIPp runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-mono text-xs uppercase ${
              mode === 'SIMULATED'
                ? 'bg-sky-950 border-sky-700 text-sky-300'
                : 'bg-purple-950 border-purple-700 text-purple-300'
            }`}
          >
            Mode: {mode}
          </Badge>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Launch State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error={launchError || 'Preflight validation checks failed. Resolve blockers before launch.'}
          onRetry={() => setState('populated')}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No preflight-verified configuration prepared."
          actionLabel="Configure Test Scenario"
          onAction={() => onNavigate && onNavigate('config')}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setMode('SIMULATED')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                mode === 'SIMULATED'
                  ? 'bg-sky-950/40 border-sky-500 shadow-sm'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span> SIMULATED EXECUTION
                </span>
                <span className="text-[10px] font-mono text-sky-400 font-bold">[DEFAULT]</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Safe deterministic simulation. Emulates CALLED/CALLER signaling, response codes, and CSVs without hardware PBX connection.
              </p>
            </div>

            <div
              onClick={() => setMode('PHYSICAL')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                mode === 'PHYSICAL'
                  ? 'bg-purple-950/40 border-purple-500 shadow-sm'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> PHYSICAL OXE EXECUTION
                </span>
                <span className="text-[10px] font-mono text-purple-400 font-bold">[HARDWARE LAB]</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Initiates actual SSH sessions to remote Linux hosts (172.19.112.50/60) and executes real SIPp against OXE PBX (172.19.112.51).
              </p>
            </div>
          </div>

          {/* Configuration Review Card */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="py-3 px-4 border-b border-slate-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Launch Parameters & Preflight Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-500 block">Target Environment</span>
                  <span className="text-slate-200 font-semibold">{environmentId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scenario Asset</span>
                  <span className="text-slate-200 font-semibold">{scenarioId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Call Rate</span>
                  <span className="text-slate-200 font-semibold">{callRate} CPS</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Call Count</span>
                  <span className="text-slate-200 font-semibold">{callCount} calls</span>
                </div>
              </div>

              {/* Physical Safety Confirmation Gate */}
              {mode === 'PHYSICAL' && (
                <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/80 space-y-2 text-rose-200">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Physical OXE SIP Traffic Confirmation Required
                  </div>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    You are preparing to generate live telecom signaling against physical PBX 172.19.112.51.
                    Verify dialplan availability and confirm operator authorization.
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmPhysical}
                      onChange={(e) => setConfirmPhysical(e.target.checked)}
                      className="w-4 h-4 rounded border-rose-700 bg-rose-950"
                    />
                    <span className="text-xs font-semibold">
                      I authorize initiating physical SIP traffic on remote Linux hosts.
                    </span>
                  </label>
                </div>
              )}

              {launchError && (
                <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {launchError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <Button
                  size="sm"
                  onClick={handleLaunch}
                  disabled={isLaunching || (mode === 'PHYSICAL' && !confirmPhysical)}
                  className={`text-xs text-white font-semibold gap-1.5 ${
                    mode === 'PHYSICAL' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  {isLaunching ? 'Initiating Orchestrator...' : `Launch ${mode} Test Run`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
