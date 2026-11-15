import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import {
  Server,
  Check,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Edit2,
  X,
  Radio,
  Download,
  Upload,
  Copy,
  CopyCheck,
  Layers,
  AlertTriangle,
} from 'lucide-react'

export interface EnvironmentItem {
  id: string
  name: string
  description?: string
  environment_type?: 'LAB' | 'DEVELOPMENT' | 'SIMULATION'
  lab_designation?: string
  pbx_host: string
  pbx_port: number
  pbx_domain: string
  trunk_group: number
  caller_runtime_id?: string
  caller_host: string
  caller_port: number
  caller_interface?: string
  called_runtime_id?: string
  called_host: string
  called_port: number
  called_interface?: string
  sip_transport: string
  network_interface?: string
  is_demo: boolean
  is_active: boolean
  status: 'VALID' | 'WARNING' | 'INVALID' | 'UNVALIDATED'
  validation_details: Record<string, any>
}

export function EnvironmentsView() {
  const [state, setState] = useState<PageState>('populated')
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportedProfile, setExportedProfile] = useState<any | null>(null)
  const [copiedExport, setCopiedExport] = useState(false)

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Form State
  const [formName, setFormName] = useState('Hardware Lab OXE Primary')
  const [formDesc, setFormDesc] = useState('Physical Alcatel-Lucent OmniPCX Enterprise test network.')
  const [formEnvType, setFormEnvType] = useState<'LAB' | 'DEVELOPMENT' | 'SIMULATION'>('LAB')
  const [formLabDesignation, setFormLabDesignation] = useState('OXE-LAB-ROCKY-01')
  const [formPbxHost, setFormPbxHost] = useState('172.19.112.51')
  const [formPbxPort, setFormPbxPort] = useState(5060)
  const [formPbxDomain, setFormPbxDomain] = useState('oxe.enterprise')
  const [formTrunkGroup, setFormTrunkGroup] = useState(4)
  const [formCallerHost, setFormCallerHost] = useState('172.19.112.50')
  const [formCallerPort, setFormCallerPort] = useState(5060)
  const [formCallerInterface, setFormCallerInterface] = useState('eth0')
  const [formCalledHost, setFormCalledHost] = useState('172.19.112.50')
  const [formCalledPort, setFormCalledPort] = useState(5080)
  const [formCalledInterface, setFormCalledInterface] = useState('eth0')
  const [formTransport, setFormTransport] = useState<'UDP' | 'TCP' | 'TLS'>('UDP')
  const [formIsDemo, setFormIsDemo] = useState(false)

  const isSingleHostForm = formCallerHost.trim() === formCalledHost.trim()
  const isPortConflictForm = isSingleHostForm && Number(formCallerPort) === Number(formCalledPort)

  const fetchEnvironments = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/environments'))
      if (res.ok) {
        const data = await res.json()
        setEnvironments(data)
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/v1/environments/${id}/activate`), { method: 'POST' })
      await fetchEnvironments()
    } catch {
      // Offline fallback
    }
  }

  const handleValidate = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/v1/environments/${id}/validate`), { method: 'POST' })
      await fetchEnvironments()
    } catch {
      // Offline fallback
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/v1/environments/${id}/duplicate`), { method: 'POST' })
      await fetchEnvironments()
    } catch {
      // Offline fallback
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/v1/environments/${id}`), { method: 'DELETE' })
      await fetchEnvironments()
    } catch {
      // Offline fallback
    }
  }

  const handleExport = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/environments/${id}/export`))
      if (res.ok) {
        const data = await res.json()
        setExportedProfile(data)
        setShowExportModal(true)
        return
      }
    } catch {
      // Offline fallback
    }
    const target = environments.find((e) => e.id === id) || defaultMockEnvironments.find((e) => e.id === id) || defaultMockEnvironments[0]
    setExportedProfile({
      name: target.name,
      description: target.description,
      environment_type: target.environment_type || 'LAB',
      lab_designation: target.lab_designation || 'OXE-LAB-01',
      pbx_host: target.pbx_host,
      pbx_port: target.pbx_port,
      pbx_domain: target.pbx_domain,
      trunk_group: target.trunk_group,
      caller_host: target.caller_host,
      caller_port: target.caller_port,
      called_host: target.called_host,
      called_port: target.called_port,
      sip_transport: target.sip_transport,
      exported_at: new Date().toISOString(),
      secret_protection: 'ZERO_CREDENTIALS_CONTAINED',
    })
    setShowExportModal(true)
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsImporting(true)
    setImportError(null)
    try {
      const parsed = JSON.parse(importJson)
      const res = await fetch(apiUrl('/api/v1/environments/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (res.ok) {
        setShowImportModal(false)
        setImportJson('')
        await fetchEnvironments()
      } else {
        const err = await res.json()
        setImportError(err.detail || 'Failed to import profile')
      }
    } catch (e: any) {
      setImportError('Invalid JSON format: ' + e.message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isPortConflictForm) {
      return
    }
    try {
      const payload = {
        name: formName,
        description: formDesc,
        environment_type: formEnvType,
        lab_designation: formLabDesignation,
        pbx_host: formPbxHost,
        pbx_port: Number(formPbxPort),
        pbx_domain: formPbxDomain,
        trunk_group: Number(formTrunkGroup),
        caller_host: formCallerHost,
        caller_port: Number(formCallerPort),
        caller_interface: formCallerInterface,
        called_host: formCalledHost,
        called_port: Number(formCalledPort),
        called_interface: formCalledInterface,
        sip_transport: formTransport,
        is_demo: formIsDemo,
      }
      const res = await fetch(apiUrl('/api/v1/environments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowCreateModal(false)
        await fetchEnvironments()
      }
    } catch {
      // Offline fallback
    }
  }

  useEffect(() => {
    fetchEnvironments()
  }, [])

  const defaultMockEnvironments: EnvironmentItem[] = [
    {
      id: 'env-lab-oxe-primary',
      name: 'Hardware Lab OXE Primary',
      description: 'Physical Alcatel-Lucent OmniPCX Enterprise test network.',
      environment_type: 'LAB',
      lab_designation: 'OXE-LAB-ROCKY-01',
      pbx_host: '172.19.112.51',
      pbx_port: 5060,
      pbx_domain: 'oxe.enterprise',
      trunk_group: 4,
      caller_host: '172.19.112.50',
      caller_port: 5060,
      caller_interface: 'eth0',
      called_host: '172.19.112.50',
      called_port: 5080,
      called_interface: 'eth0',
      sip_transport: 'UDP',
      is_demo: false,
      is_active: false,
      status: 'VALID',
      validation_details: { summary: 'Rocky Linux single-host execution ready.' },
    },
    {
      id: 'env-local-simulation',
      name: 'Local Windows Simulation (Demo)',
      description: 'In-memory software prototype with virtual loopback signaling.',
      environment_type: 'SIMULATION',
      pbx_host: '127.0.0.1',
      pbx_port: 5060,
      pbx_domain: 'local.test',
      trunk_group: 1,
      caller_host: '127.0.0.1',
      caller_port: 5060,
      called_host: '127.0.0.1',
      called_port: 5080,
      sip_transport: 'UDP',
      is_demo: true,
      is_active: true,
      status: 'VALID',
      validation_details: { summary: 'Local simulation ready.' },
    },
  ]

  const displayList = environments.length > 0 ? environments : defaultMockEnvironments

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Environments & Target Nodes</h2>
          <p className="text-xs text-muted-foreground">Manage PBX interconnects, CALLER/CALLED topology, and active test targets</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchEnvironments} disabled={isLoading} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)} className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" /> Import Profile
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Create Environment
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Environments State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && <ErrorState error="Failed to query environment profiles from database." />}
      {state === 'empty' && <EmptyState message="No environments defined yet." actionLabel="Create First Environment" onAction={() => setShowCreateModal(true)} />}

      {state === 'populated' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((env) => {
            const isSelected = env.is_active
            const isReady = env.status === 'VALID'
            const isWarning = env.status === 'WARNING'
            const isSingleHost = env.caller_host === env.called_host
            const isPortConflict = isSingleHost && env.caller_port === env.called_port
            const envType = env.environment_type || (env.is_demo ? 'SIMULATION' : 'LAB')

            return (
              <Card key={env.id} className={`border transition-all flex flex-col justify-between ${isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border/60'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-sm font-semibold">{env.name}</CardTitle>
                        {env.is_demo && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px] uppercase font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{env.id}</span>
                        {env.lab_designation && (
                          <span className="text-[9px] text-purple-300 font-mono bg-purple-950/60 px-1 rounded border border-purple-800/40">
                            {env.lab_designation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={isReady ? 'success' : isWarning ? 'warning' : 'destructive'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {env.status}
                      </Badge>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                        envType === 'LAB'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : envType === 'SIMULATION'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}>
                        {envType}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs flex-1 flex flex-col justify-between">
                  {env.description && (
                    <p className="text-muted-foreground text-[11px] line-clamp-2">{env.description}</p>
                  )}

                  {/* Topology Banner */}
                  {isPortConflict ? (
                    <div className="p-1.5 rounded bg-rose-500/20 border border-rose-500/40 text-[10px] text-rose-300 flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>PORT CONFLICT: Same port on shared host</span>
                    </div>
                  ) : isSingleHost ? (
                    <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/30 text-[10px] text-sky-300 flex items-center justify-between font-mono">
                      <span>Single-Host Topology</span>
                      <span className="text-sky-400 font-bold">Port Isolated (5060/5080)</span>
                    </div>
                  ) : null}

                  <div className="space-y-1.5 p-2 rounded bg-muted/20 border border-border/40 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OXE PBX Node:</span>
                      <span className="text-emerald-400 font-semibold">{env.pbx_host}:{env.pbx_port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trunk Group:</span>
                      <span className="text-foreground">TG {env.trunk_group} ({env.pbx_domain})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Caller (UAC):</span>
                      <span className="text-foreground">
                        {env.caller_host}:{env.caller_port} {env.caller_interface ? `(${env.caller_interface})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Called (UAS):</span>
                      <span className="text-foreground">
                        {env.called_host}:{env.called_port} {env.called_interface ? `(${env.called_interface})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transport:</span>
                      <span className="text-foreground font-semibold">{env.sip_transport}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="w-full text-xs h-7"
                        onClick={() => handleActivate(env.id)}
                      >
                        {isSelected ? <><Check className="w-3.5 h-3.5 mr-1" /> Active Target</> : 'Select Target'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleValidate(env.id)}
                        title="Validate Environment"
                      >
                        Validate
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleDelete(env.id)}
                        title="Delete Environment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleExport(env.id)}
                        title="Export Reusable Profile (Zero Secrets)"
                      >
                        <Download className="w-3 h-3" /> Export Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDuplicate(env.id)}
                        title="Clone Configuration Profile"
                      >
                        <Layers className="w-3 h-3" /> Duplicate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Environment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-base font-bold text-foreground">Create Test Environment Profile</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-muted-foreground block mb-1">Environment Profile Name</label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Type</label>
                  <select
                    value={formEnvType}
                    onChange={(e) => setFormEnvType(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    <option value="LAB">LAB (Physical)</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                    <option value="SIMULATION">SIMULATION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Lab Designation Code</label>
                  <Input
                    value={formLabDesignation}
                    onChange={(e) => setFormLabDesignation(e.target.value)}
                    placeholder="e.g. OXE-LAB-ROCKY-01"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">SIP Transport</label>
                  <select
                    value={formTransport}
                    onChange={(e) => setFormTransport(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    <option value="UDP">UDP (Standard RFC 3261)</option>
                    <option value="TCP">TCP</option>
                    <option value="TLS">TLS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Description</label>
                <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
              </div>

              {/* PBX Interconnect */}
              <div className="p-2.5 rounded bg-muted/20 border border-border/40 space-y-2">
                <div className="text-[11px] font-semibold text-primary uppercase tracking-wide">OXE PBX Interconnect</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-muted-foreground block mb-1">OXE PBX IP</label>
                    <Input value={formPbxHost} onChange={(e) => setFormPbxHost(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">SIP Port</label>
                    <Input type="number" value={formPbxPort} onChange={(e) => setFormPbxPort(Number(e.target.value))} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1">SIP Domain / Realm</label>
                    <Input value={formPbxDomain} onChange={(e) => setFormPbxDomain(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Trunk Group</label>
                    <Input type="number" value={formTrunkGroup} onChange={(e) => setFormTrunkGroup(Number(e.target.value))} required />
                  </div>
                </div>
              </div>

              {/* CALLER & CALLED Execution Nodes */}
              <div className="p-2.5 rounded bg-muted/20 border border-border/40 space-y-2">
                <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wide">Execution Host Configuration</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-muted-foreground block mb-1">CALLER Node Host</label>
                    <Input value={formCallerHost} onChange={(e) => setFormCallerHost(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Local Port</label>
                    <Input type="number" value={formCallerPort} onChange={(e) => setFormCallerPort(Number(e.target.value))} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-muted-foreground block mb-1">CALLED Node Host</label>
                    <Input value={formCalledHost} onChange={(e) => setFormCalledHost(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Local Port</label>
                    <Input type="number" value={formCalledPort} onChange={(e) => setFormCalledPort(Number(e.target.value))} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted-foreground block mb-1">Caller Interface (Optional)</label>
                    <Input
                      value={formCallerInterface}
                      onChange={(e) => setFormCallerInterface(e.target.value)}
                      placeholder="e.g. eth0"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Called Interface (Optional)</label>
                    <Input
                      value={formCalledInterface}
                      onChange={(e) => setFormCalledInterface(e.target.value)}
                      placeholder="e.g. eth0"
                    />
                  </div>
                </div>

                {/* Conflict Alert Banner */}
                {isPortConflictForm ? (
                  <div className="p-2 rounded bg-rose-500/20 border border-rose-500/50 text-[11px] text-rose-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Port Collision Blocker</span>
                    </div>
                    <p className="text-[10px]">
                      Caller and Called cannot bind to the same port ({formCallerPort}) on the same host ({formCallerHost}).
                      Please assign distinct ports (e.g. Caller: 5060, Called: 5080).
                    </p>
                  </div>
                ) : isSingleHostForm ? (
                  <div className="p-2 rounded bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-300">
                    <span className="font-semibold">Single-Host Mode: </span>
                    Both roles run on {formCallerHost}. Port isolation is valid (Caller: {formCallerPort}, Called: {formCalledPort}).
                  </div>
                ) : null}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDemo}
                    onChange={(e) => setFormIsDemo(e.target.checked)}
                    className="rounded"
                  />
                  <span>Flag as Demonstration / Prototype Profile</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPortConflictForm}>
                  Save Environment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Profile Modal */}
      {showExportModal && exportedProfile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-foreground">Export Environment Profile</h3>
              </div>
              <button type="button" onClick={() => setShowExportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Zero Secrets Contained: Passwords and private keys are excluded from profile exports.</span>
              </div>

              <div className="relative">
                <pre className="p-3 bg-black/60 rounded border border-border/50 text-[11px] font-mono text-foreground overflow-x-auto max-h-64">
                  {JSON.stringify(exportedProfile, null, 2)}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(exportedProfile, null, 2))
                    setCopiedExport(true)
                    setTimeout(() => setCopiedExport(false), 2000)
                  }}
                  className="absolute right-2 top-2 p-1.5 rounded bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Copy to clipboard"
                >
                  {copiedExport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowExportModal(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(exportedProfile, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${exportedProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_profile.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Download JSON
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Profile Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-bold text-foreground">Import Environment Profile</h3>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3 text-xs">
              <p className="text-muted-foreground text-[11px]">
                Paste an exported environment profile JSON configuration below. No credential or password fields are expected.
              </p>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{\n  "name": "Rocky Linux Lab Secondary",\n  "pbx_host": "172.19.112.51",\n  "caller_host": "172.19.112.50",\n  "caller_port": 5060,\n  "called_host": "172.19.112.50",\n  "called_port": 5080\n}'
                className="w-full h-44 p-2 font-mono text-[11px] bg-black/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />

              {importError && (
                <div className="p-2 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    setImportJson(
                      JSON.stringify(
                        {
                          name: 'Rocky Linux Lab Dual-Role',
                          description: 'Imported Rocky Linux lab profile for dual UAC/UAS execution',
                          environment_type: 'LAB',
                          lab_designation: 'OXE-LAB-ROCKY-IMPORT',
                          pbx_host: '172.19.112.51',
                          pbx_port: 5060,
                          pbx_domain: 'oxe.enterprise',
                          trunk_group: 4,
                          caller_host: '172.19.112.50',
                          caller_port: 5062,
                          caller_interface: 'eth0',
                          called_host: '172.19.112.50',
                          called_port: 5082,
                          called_interface: 'eth0',
                          sip_transport: 'UDP',
                          is_demo: false,
                        },
                        null,
                        2
                      )
                    )
                  }}
                >
                  Load Sample Lab Profile
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isImporting || !importJson.trim()}>
                    {isImporting ? 'Importing...' : 'Import Profile'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
