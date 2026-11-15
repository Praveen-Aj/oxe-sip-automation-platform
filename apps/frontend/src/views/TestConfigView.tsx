import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { ConfigurationStep } from '../components/ConfigurationStep'
import { ConfigurationSummary } from '../components/ConfigurationSummary'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { type ScenarioItem } from '../components/ScenarioCard'
import {
  Sliders,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  Save,
  Play,
  RotateCw,
  Server,
  BookOpen
} from 'lucide-react'

export interface TestConfigViewProps {
  initialScenario?: ScenarioItem | null
  onNavigate?: (pageId: string, context?: any) => void
}

export function TestConfigView({ initialScenario, onNavigate }: TestConfigViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [currentStep, setCurrentStep] = useState(1)

  // Remote data
  const [environments, setEnvironments] = useState<any[]>([])
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([])
  const [selectedEnvId, setSelectedEnvId] = useState<string>('env-local-simulation')
  const [selectedScenario, setSelectedScenario] = useState<ScenarioItem | null>(initialScenario || null)

  // Form Fields
  const [configName, setConfigName] = useState('OXE Staging Load Profile')
  const [callerStart, setCallerStart] = useState('55001')
  const [callerEnd, setCallerEnd] = useState('55010')
  const [calledStart, setCalledStart] = useState('55011')
  const [calledEnd, setCalledEnd] = useState('55020')
  const [callerPort, setCallerPort] = useState('5060')
  const [calledPort, setCalledPort] = useState('5080')
  const [transport, setTransport] = useState('UDP')
  const [callRate, setCallRate] = useState('10.0')
  const [callCount, setCallCount] = useState('100')
  const [authEnabled, setAuthEnabled] = useState(true)
  const [authPassword, setAuthPassword] = useState('secret')
  const [prackEnabled, setPrackEnabled] = useState(true)
  const [codec, setCodec] = useState('PCMA')

  // CSV Preview & Save
  const [savedConfigId, setSavedConfigId] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const steps = [
    { id: 1, title: 'Environment', subtitle: 'Target OXE & nodes' },
    { id: 2, title: 'Scenario', subtitle: 'SIP scenario selection' },
    { id: 3, title: 'Dialplan & Ports', subtitle: 'Subscriber ranges' },
    { id: 4, title: 'Traffic & Protocol', subtitle: 'Rate, Auth, PRACK' },
    { id: 5, title: 'Review & CSV', subtitle: 'Save & Preflight' },
  ]

  useEffect(() => {
    // Fetch environments
    fetch(apiUrl('/api/v1/environments'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEnvironments(data)
          if (!selectedEnvId) setSelectedEnvId(data[0].id)
        }
      })
      .catch(() => {})

    // Fetch scenarios
    fetch(apiUrl('/api/v1/scenarios'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setScenarios(data)
          if (!selectedScenario) {
            const defaultScen = data.find((s: any) => s.id === 'invite-caller-auth-prack') || data[0]
            setSelectedScenario(defaultScen)
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleSaveConfiguration = async () => {
    setIsSaving(true)
    const payload = {
      name: configName,
      description: `Targeting ${selectedScenario?.name || 'SIP scenario'}`,
      environment_id: selectedEnvId,
      scenario_id: selectedScenario?.id || 'invite-caller-auth-prack',
      caller_range_start: parseInt(callerStart, 10) || 55001,
      caller_range_end: parseInt(callerEnd, 10) || 55010,
      called_range_start: parseInt(calledStart, 10) || 55011,
      called_range_end: parseInt(calledEnd, 10) || 55020,
      caller_port: parseInt(callerPort, 10) || 5060,
      called_port: parseInt(calledPort, 10) || 5080,
      transport: transport,
      call_rate: parseFloat(callRate) || 10.0,
      call_count: parseInt(callCount, 10) || 100,
      auth_enabled: authEnabled,
      auth_password: authPassword,
      prack_enabled: prackEnabled,
      media_enabled: true,
      codec: codec,
    }

    try {
      const res = await fetch(apiUrl('/api/v1/configurations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setSavedConfigId(data.id)
        setSaveSuccess(true)

        // Generate CSV preview
        const csvRes = await fetch(apiUrl(`/api/v1/configurations/${data.id}/generate-csv`), {
          method: 'POST',
        })
        if (csvRes.ok) {
          const csvData = await csvRes.json()
          setCsvPreview(csvData)
        }
      }
    } catch {
      // Mock fallback
      setSavedConfigId('cfg-simulated-1')
      setSaveSuccess(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleProceedToPreflight = () => {
    if (onNavigate) {
      onNavigate('preflight', {
        environmentId: selectedEnvId,
        scenarioId: selectedScenario?.id,
        configurationId: savedConfigId,
      })
    }
  }

  const selectedEnv = environments.find((e) => e.id === selectedEnvId)
  const estSeconds = Math.ceil((parseInt(callCount, 10) || 100) / (parseFloat(callRate) || 10.0))

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            Test Configuration Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parameterize traffic rates, subscriber dialplans, authentication challenges, and generate execution CSVs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedConfigId && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-800 bg-emerald-950 font-mono text-xs">
              Saved: {savedConfigId}
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleProceedToPreflight}
            className="text-xs bg-sky-600 hover:bg-sky-500 text-white gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Proceed to Preflight
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Configuration State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Configuration validation failed: Incompatible dialplan range with active Trunk Group 4."
          onRetry={() => setState('populated')}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No active profile in draft workspace. Create a new test configuration."
          actionLabel="Load Recommended Defaults"
          onAction={() => setState('populated')}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-6">
          {/* Step Indicator */}
          <ConfigurationStep steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

          {/* STEP 1: ENVIRONMENT SELECTION */}
          {currentStep === 1 && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="py-3 px-4 border-b border-slate-800">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Step 1: Select Target Environment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {environments.length === 0 ? (
                    <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
                      Loading environments from backend...
                    </div>
                  ) : (
                    environments.map((env) => (
                      <div
                        key={env.id}
                        onClick={() => setSelectedEnvId(env.id)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          selectedEnvId === env.id
                            ? 'bg-sky-950/40 border-sky-500 shadow-sm'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-slate-200">{env.name}</span>
                          {env.is_demo && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-950 border border-purple-800 text-purple-300">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                          <div>PBX Host: {env.pbx_host}:{env.pbx_port}</div>
                          <div>Trunk Group: TG-{env.trunk_group}</div>
                          <div>Caller IP: {env.caller_host}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs"
                  >
                    Next: Choose Scenario <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: SCENARIO SELECTION */}
          {currentStep === 2 && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="py-3 px-4 border-b border-slate-800">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Step 2: Choose SIP Scenario Asset
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scenarios.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedScenario(sc)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedScenario?.id === sc.id
                          ? 'bg-sky-950/40 border-sky-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-slate-200">{sc.name}</span>
                        <span className="text-[10px] font-mono font-bold text-sky-400">[{sc.role}]</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{sc.description}</p>
                      <div className="flex gap-1.5 mt-2">
                        {sc.authentication && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-950 border border-purple-800 text-purple-300 font-mono">
                            Auth
                          </span>
                        )}
                        {sc.prack && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                            PRACK
                          </span>
                        )}
                        {sc.media && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950 border border-amber-800 text-amber-300 font-mono">
                            SDP
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)} className="text-xs border-slate-700">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button size="sm" onClick={() => setCurrentStep(3)} className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                    Next: Dialplan Settings <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: DIALPLAN & PORTS */}
          {currentStep === 3 && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="py-3 px-4 border-b border-slate-800">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Step 3: Dialplan Subscribers & Networking Ports
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Configuration Profile Name</label>
                    <Input
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">SIP Transport</label>
                    <select
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200"
                    >
                      <option value="UDP">UDP (Standard RFC 3261)</option>
                      <option value="TCP">TCP</option>
                      <option value="TLS">TLS</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Caller Extension Start (field0)</label>
                    <Input
                      value={callerStart}
                      onChange={(e) => setCallerStart(e.target.value)}
                      type="number"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Caller Extension End</label>
                    <Input
                      value={callerEnd}
                      onChange={(e) => setCallerEnd(e.target.value)}
                      type="number"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  {selectedScenario?.role !== 'REG' && (
                    <>
                      <div>
                        <label className="text-slate-400 block mb-1">Called Extension Start (field1)</label>
                        <Input
                          value={calledStart}
                          onChange={(e) => setCalledStart(e.target.value)}
                          type="number"
                          className="bg-slate-950 border-slate-800 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Called Extension End</label>
                        <Input
                          value={calledEnd}
                          onChange={(e) => setCalledEnd(e.target.value)}
                          type="number"
                          className="bg-slate-950 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-slate-400 block mb-1">Caller SIP Local Port</label>
                    <Input
                      value={callerPort}
                      onChange={(e) => setCallerPort(e.target.value)}
                      type="number"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Called SIP Local Port</label>
                    <Input
                      value={calledPort}
                      onChange={(e) => setCalledPort(e.target.value)}
                      type="number"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="text-xs border-slate-700">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button size="sm" onClick={() => setCurrentStep(4)} className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                    Next: Traffic & Protocol <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: TRAFFIC & PROTOCOL */}
          {currentStep === 4 && (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="py-3 px-4 border-b border-slate-800">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Step 4: Traffic Rates, SIP Authentication & PRACK
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Calls Per Second (CPS Rate)</label>
                    <Input
                      value={callRate}
                      onChange={(e) => setCallRate(e.target.value)}
                      type="number"
                      step="0.5"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Total Call Count (-m)</label>
                    <Input
                      value={callCount}
                      onChange={(e) => setCallCount(e.target.value)}
                      type="number"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">SIP Digest Authentication (RFC 2617)</div>
                        <div className="text-[11px] text-slate-500">Inject [authentication] credential block into field4</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={authEnabled}
                        onChange={(e) => setAuthEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900"
                      />
                    </div>

                    {authEnabled && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <label className="text-slate-400 block mb-1">Subscriber Auth Password</label>
                        <Input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-xs font-mono max-w-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2 p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">100rel PRACK Provisional Reliability (RFC 3262)</div>
                      <div className="text-[11px] text-slate-500">Include 'Supported: 100rel' and acknowledge 180/183 RSeq</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={prackEnabled}
                      onChange={(e) => setPrackEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Media Audio Codec</label>
                    <select
                      value={codec}
                      onChange={(e) => setCodec(e.target.value)}
                      className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200"
                    >
                      <option value="PCMA">PCMA (G.711 A-law / rtpmap:8)</option>
                      <option value="PCMU">PCMU (G.711 u-law / rtpmap:0)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)} className="text-xs border-slate-700">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button size="sm" onClick={() => setCurrentStep(5)} className="bg-sky-600 hover:bg-sky-500 text-white text-xs">
                    Next: Review & Save <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5: REVIEW, SAVE & CSV PREVIEW */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <ConfigurationSummary
                scenarioName={selectedScenario?.name || 'Unspecified'}
                environmentName={selectedEnv?.name || 'Local Simulation'}
                callerRange={`${callerStart}-${callerEnd}`}
                calledRange={`${calledStart}-${calledEnd}`}
                callRate={parseFloat(callRate) || 10.0}
                callCount={parseInt(callCount, 10) || 100}
                transport={`${transport} / ${callerPort}`}
                authEnabled={authEnabled}
                prackEnabled={prackEnabled}
                estimatedDuration={`${estSeconds} seconds`}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Save Configuration & Generate CSV</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Persists profile in SQLite and generates chmod 600 subscriber CSV
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveConfiguration}
                    disabled={isSaving}
                    className="text-xs border-slate-700"
                  >
                    {isSaving ? (
                      <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {saveSuccess ? 'Configuration Saved' : 'Save Configuration'}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleProceedToPreflight}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Launch Preflight Validation
                  </Button>
                </div>
              </div>

              {/* Dynamic CSV Preview Box */}
              {csvPreview && (
                <Card className="bg-slate-900 border-slate-800 text-slate-100 font-mono text-xs">
                  <CardHeader className="py-2.5 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Dynamic CSV Output Preview: {csvPreview.filename}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                      {csvPreview.permissions}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-[11px]">
                    <div className="text-slate-400 text-[10px]">
                      Headers: <span className="text-sky-300 font-bold">{csvPreview.headers.join(';')}</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-slate-300">
                      {csvPreview.sample_rows.map((row: string[], idx: number) => (
                        <div key={idx} className="truncate">
                          {row.join(';')}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)} className="text-xs border-slate-700">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Traffic
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
