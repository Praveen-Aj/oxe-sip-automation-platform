import React, { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { ExecutionStatusCard } from '../components/ExecutionStatusCard'
import { HostTelemetryPanel } from '../components/HostTelemetryPanel'
import { MetricCard } from '../components/MetricCard'
import { ResponseDistribution } from '../components/ResponseDistribution'
import { Play, Square, RotateCw, Terminal, Activity, FileText, Search } from 'lucide-react'

export interface LiveMonitorViewProps {
  initialExecutionId?: string
  onNavigate?: (pageId: string, context?: any) => void
}

export function LiveMonitorView({ initialExecutionId, onNavigate }: LiveMonitorViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [executionId, setExecutionId] = useState<string>(initialExecutionId || 'exec-sim-active')
  const [execData, setExecData] = useState<any | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isStopping, setIsStopping] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  // Fetch or poll execution state
  const fetchExecution = async () => {
    try {
      const res = await fetch(apiUrl(`/api/v1/executions/${executionId}`))
      if (res.ok) {
        const data = await res.json()
        setExecData(data)
      }
    } catch {
      // Fallback
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch(apiUrl(`/api/v1/executions/${executionId}/logs`))
      if (res.ok) {
        const logData = await res.json()
        setLogs(logData)
      }
    } catch {
      // Fallback
    }
  }

  const handleStop = async () => {
    setIsStopping(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/executions/${executionId}/stop`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Operator requested stop from Live Monitor' }),
      })
      if (res.ok) {
        await fetchExecution()
      }
    } catch {
      // Fallback
    } finally {
      setIsStopping(false)
    }
  }

  useEffect(() => {
    fetchExecution()
    fetchLogs()

    const interval = setInterval(() => {
      fetchExecution()
      fetchLogs()
    }, 2000)

    return () => clearInterval(interval)
  }, [executionId])

  // Mock initial telemetry if not loaded
  const currentExec = execData || {
    id: executionId,
    mode: 'SIMULATED',
    state: 'RUNNING',
    environment_id: 'env-local-simulation',
    scenario_id: 'invite-caller-auth-prack',
    duration_seconds: 14.5,
    caller_host: {
      role: 'CALLER',
      hostname: '127.0.0.1',
      pid: 9011,
      is_alive: true,
      status: 'RUNNING',
    },
    called_host: {
      role: 'CALLED',
      hostname: '127.0.0.1',
      pid: 9010,
      is_alive: true,
      status: 'READY',
    },
    metrics: {
      total_calls: 150,
      successful_calls: 148,
      failed_calls: 2,
      current_cps: 15.0,
      active_calls: 2,
      retransmissions: 1,
      timeouts: 0,
      response_distribution: {
        '100 Trying': 150,
        '180 Ringing': 150,
        '200 OK': 148,
        '503 Service Unavailable': 2,
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-400" />
            Live Execution & Telemetry Monitor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time SIP signaling telemetry, CPS rates, host process health, and response codes
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-xs border-emerald-800 bg-emerald-950 text-emerald-300">
            Telemetry Stream: Live
          </Badge>
          {onNavigate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('diagnostics', { executionId })}
              className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5"
            >
              <Search className="w-3.5 h-3.5" /> Diagnostics
            </Button>
          )}
          {onNavigate && (
            <Button
              size="sm"
              onClick={() => onNavigate('reports', { executionId })}
              className="text-xs bg-sky-600 hover:bg-sky-500 text-white gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> View Report
            </Button>
          )}
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Monitor State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Lost WebSocket telemetry connection to remote host. Reconnecting..."
          onRetry={fetchExecution}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No active SIP execution currently streaming telemetry."
          actionLabel="Launch Test Run"
          onAction={() => onNavigate && onNavigate('execution')}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-6">
          {/* Main Execution Card */}
          <ExecutionStatusCard
            executionId={currentExec.id}
            mode={currentExec.mode}
            state={currentExec.state}
            environmentName={currentExec.environment_id}
            scenarioName={currentExec.scenario_id}
            callRate={currentExec.metrics?.current_cps || 10.0}
            callCount={100}
            durationSeconds={currentExec.duration_seconds}
            onStop={handleStop}
            isStopping={isStopping}
          />

          {/* Dual Host Telemetry Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HostTelemetryPanel
              role="CALLER"
              hostname={currentExec.caller_host?.hostname || '127.0.0.1'}
              status={currentExec.caller_host?.status || 'RUNNING'}
              pid={currentExec.caller_host?.pid}
              isAlive={currentExec.caller_host?.is_alive || false}
              totalEvents={currentExec.metrics?.total_calls || 0}
            />
            <HostTelemetryPanel
              role="CALLED"
              hostname={currentExec.called_host?.hostname || '127.0.0.1'}
              status={currentExec.called_host?.status || 'READY'}
              pid={currentExec.called_host?.pid}
              isAlive={currentExec.called_host?.is_alive || false}
              totalEvents={currentExec.metrics?.total_calls || 0}
            />
          </div>

          {/* Key Telecom Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Calls Initiated"
              value={currentExec.metrics?.total_calls || 0}
              subValue="Target: 100"
              variant="default"
            />
            <MetricCard
              label="Successful (200 OK)"
              value={currentExec.metrics?.successful_calls || 0}
              subValue={`${Math.round(((currentExec.metrics?.successful_calls || 0) / (currentExec.metrics?.total_calls || 1)) * 100)}% Success`}
              variant="success"
            />
            <MetricCard
              label="Failed Calls"
              value={currentExec.metrics?.failed_calls || 0}
              subValue={`${currentExec.metrics?.retransmissions || 0} Retransmissions`}
              variant="danger"
            />
            <MetricCard
              label="Current Rate"
              value={`${currentExec.metrics?.current_cps || 0} CPS`}
              subValue={`${currentExec.metrics?.active_calls || 0} Active Dialogs`}
              variant="accent"
            />
          </div>

          {/* Response Distribution */}
          <ResponseDistribution
            distribution={currentExec.metrics?.response_distribution || { '200 OK': 100 }}
          />

          {/* Live Log Stream Box */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="py-2.5 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Live Orchestration & SIPp Terminal Stream
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-[9px] text-slate-400 border-slate-700">
                {logs.length} Lines
              </Badge>
            </CardHeader>
            <CardContent className="p-3 bg-black/60 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-600">Awaiting SIPp process stream output...</div>
              ) : (
                logs.map((line, idx) => <div key={idx}>{line}</div>)
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
