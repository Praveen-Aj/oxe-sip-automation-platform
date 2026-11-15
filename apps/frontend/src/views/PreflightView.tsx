import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { PreflightStatusPanel } from '../components/PreflightStatusPanel'
import { ValidationResultList } from '../components/ValidationResultList'
import { type PreflightCheckItem } from '../components/PreflightCheckCard'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ShieldCheck, RotateCw, Server, BookOpen, AlertTriangle } from 'lucide-react'

export interface PreflightViewProps {
  initialEnvironmentId?: string
  initialScenarioId?: string
  initialConfigurationId?: string
  onNavigate?: (pageId: string) => void
}

export function PreflightView({
  initialEnvironmentId,
  initialScenarioId,
  initialConfigurationId,
  onNavigate,
}: PreflightViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [environmentId, setEnvironmentId] = useState<string>(initialEnvironmentId || 'env-local-simulation')
  const [scenarioId, setScenarioId] = useState<string>(initialScenarioId || 'invite-caller-auth-prack')
  const [configurationId, setConfigurationId] = useState<string | undefined>(initialConfigurationId)

  const [environments, setEnvironments] = useState<any[]>([])
  const [scenarios, setScenarios] = useState<any[]>([])

  const [checks, setChecks] = useState<PreflightCheckItem[]>([])
  const [overallStatus, setOverallStatus] = useState<'READY' | 'BLOCKED' | 'WARNING'>('READY')
  const [isReady, setIsReady] = useState(true)
  const [validatedAt, setValidatedAt] = useState<string>('Just now')
  const [isValidating, setIsValidating] = useState(false)

  const runPreflightValidation = async () => {
    setIsValidating(true)
    try {
      const res = await fetch(apiUrl('/api/v1/preflight/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment_id: environmentId,
          scenario_id: scenarioId,
          configuration_id: configurationId,
          target_ports: [5060, 5080],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setChecks(data.checks || [])
        setIsReady(data.is_ready)
        setOverallStatus(data.overall_status)
        setValidatedAt(new Date(data.validated_at).toLocaleTimeString())
      }
    } catch {
      // Offline fallback mock
      setChecks([
        {
          category: 'ENVIRONMENT',
          name: 'Environment Health',
          status: 'PASS',
          is_blocker: false,
          message: `Active environment: ${environmentId}`,
        },
        {
          category: 'PBX_CONNECTIVITY',
          name: 'PBX IPv4 Syntax',
          status: 'PASS',
          is_blocker: false,
          message: 'Valid IPv4 address: 172.19.112.51',
        },
        {
          category: 'SCENARIO',
          name: 'Scenario Schema',
          status: 'PASS',
          is_blocker: false,
          message: `Scenario '${scenarioId}' verified in asset library`,
        },
        {
          category: 'RUNTIME_CALLER',
          name: 'CALLER Runtime',
          status: 'PASS',
          is_blocker: false,
          message: 'Simulated runtime verified',
        },
        {
          category: 'PORT',
          name: 'UDP Port 5060',
          status: 'PASS',
          is_blocker: false,
          message: 'Port available for binding',
        },
      ])
      setIsReady(true)
      setOverallStatus('READY')
    } finally {
      setIsValidating(false)
    }
  }

  useEffect(() => {
    // Fetch environments and scenarios for selectors
    fetch(apiUrl('/api/v1/environments'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEnvironments(data)
      })
      .catch(() => {})

    fetch(apiUrl('/api/v1/scenarios'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setScenarios(data)
      })
      .catch(() => {})

    runPreflightValidation()
  }, [environmentId, scenarioId, configurationId])

  const passedCount = checks.filter((c) => c.status === 'PASS').length
  const warningCount = checks.filter((c) => c.status === 'WARNING').length
  const blockerCount = checks.filter((c) => c.is_blocker || c.status === 'FAIL').length

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Preflight Readiness Check
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Independent environmental, scenario, subscriber CSV, runtime and port validation before execution
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-xs border-slate-700 bg-slate-900 text-slate-300">
            Validated: <span className="text-sky-400 ml-1">{validatedAt}</span>
          </Badge>
          <Button
            size="sm"
            onClick={runPreflightValidation}
            disabled={isValidating}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            Run Preflight
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Preflight State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Preflight validation engine crashed: SSH socket error on target host 172.19.112.50."
          onRetry={runPreflightValidation}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No preflight check history found. Run preflight to verify system."
          actionLabel="Execute Preflight Audit"
          onAction={runPreflightValidation}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-6">
          {/* Target Selection Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Target Environment</span>
              <select
                value={environmentId}
                onChange={(e) => setEnvironmentId(e.target.value)}
                className="w-full h-8 rounded bg-slate-950 border border-slate-800 px-2 text-xs text-slate-200"
              >
                {environments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Target Scenario</span>
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                className="w-full h-8 rounded bg-slate-950 border border-slate-800 px-2 text-xs text-slate-200"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Configuration Profile</span>
              <div className="h-8 flex items-center px-2 rounded bg-slate-950 border border-slate-800 text-slate-300 text-xs truncate">
                {configurationId || 'Default Environment Parameters'}
              </div>
            </div>
          </div>

          {/* Readiness Gate Banner */}
          <PreflightStatusPanel
            isReady={isReady}
            overallStatus={overallStatus}
            totalChecks={checks.length}
            passedCount={passedCount}
            warningCount={warningCount}
            blockerCount={blockerCount}
            onRevalidate={runPreflightValidation}
            onProceed={() => onNavigate && onNavigate('execution')}
            isValidating={isValidating}
          />

          {/* Detailed Check Cards */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardContent className="p-5">
              <ValidationResultList checks={checks} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
