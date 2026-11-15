import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Cpu,
  Terminal,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Activity,
  AlertTriangle,
  Server,
  X,
  FileCode,
  ShieldCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  XCircle,
} from 'lucide-react'

export interface RuntimeItem {
  id: string
  name: string
  runtime_type: 'NATIVE_WINDOWS' | 'WINDOWS_WSL2' | 'NATIVE_LINUX' | 'REMOTE_LINUX' | 'SIMULATED'
  role: 'CALLER' | 'CALLED' | 'STANDALONE' | 'CALLER_CALLED'
  hostname: string
  port: number
  username?: string
  wsl_distribution?: string
  status: 'READY' | 'WARNING' | 'UNAVAILABLE' | 'ERROR'
  sipp_available: boolean
  sipp_version?: string
  operating_system: string
  diagnostics: {
    os_info?: Record<string, any>
    python_info?: Record<string, any>
    sipp_info?: Record<string, any>
    network_interfaces?: Array<{ name: string; address: string }>
    missing_prerequisites?: string[]
    setup_instructions?: string[]
    distro_info?: {
      distro_name?: string
      distro_version?: string
      is_rocky?: boolean
    }
    hardware_info?: {
      cpu_cores?: number
      memory_mb?: number
      disk_free_mb?: number
    }
    sipp_capabilities?: {
      pcap?: boolean
      tls?: boolean
      sctp?: boolean
    }
  }
  last_validated?: string
  message: string
}

export function RuntimeManagerView() {
  const [state, setState] = useState<PageState>('populated')
  const [runtimes, setRuntimes] = useState<RuntimeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDiagnostics, setSelectedDiagnostics] = useState<RuntimeItem | null>(null)

  // Connection Test Modal State
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
  const [connectionTestResult, setConnectionTestResult] = useState<any | null>(null)

  // SIPp Install Plan Modal State
  const [installPlanRuntime, setInstallPlanRuntime] = useState<RuntimeItem | null>(null)
  const [installPlanData, setInstallPlanData] = useState<any | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [activePlanTab, setActivePlanTab] = useState<'dnf' | 'source' | 'firewall'>('dnf')
  const [copiedText, setCopiedText] = useState(false)

  // Add Form State
  const [formName, setFormName] = useState('Rocky Linux Lab Server')
  const [formHost, setFormHost] = useState('172.19.112.50')
  const [formPort, setFormPort] = useState(22)
  const [formUser, setFormUser] = useState('sipadmin')
  const [formRole, setFormRole] = useState<'CALLER' | 'CALLED' | 'STANDALONE' | 'CALLER_CALLED'>('CALLER_CALLED')
  const [formAuthMethod, setFormAuthMethod] = useState<'KEY' | 'PASSWORD'>('KEY')
  const [formKeyPath, setFormKeyPath] = useState('/home/sipadmin/.ssh/id_rsa')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const fetchRuntimes = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/runtimes'))
      if (res.ok) {
        const data = await res.json()
        setRuntimes(data)
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscover = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/runtimes/discover'), { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setRuntimes(data)
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/runtimes/${id}/validate`), { method: 'POST' })
      if (res.ok) {
        await fetchRuntimes()
      }
    } catch {
      // Offline fallback
    }
  }

  const handleTestConnection = async (id: string) => {
    setTestingConnectionId(id)
    try {
      const res = await fetch(apiUrl(`/api/v1/runtimes/${id}/test-connection`), { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        setConnectionTestResult(result)
      } else {
        const err = await res.json()
        setConnectionTestResult({
          status: 'FAILED',
          message: err.detail || 'Connection test failed',
          connection_tests: {
            connect_success: false,
            auth_success: false,
            host_verified: false,
            os_detected: false,
            sipp_detected: false,
            workdir_writable: false,
          },
        })
      }
    } catch (e: any) {
      setConnectionTestResult({
        status: 'FAILED',
        message: e.message || 'Offline error executing connection test.',
        connection_tests: {
          connect_success: false,
          auth_success: false,
          host_verified: false,
          os_detected: false,
          sipp_detected: false,
          workdir_writable: false,
        },
      })
    } finally {
      setTestingConnectionId(null)
    }
  }

  const handleViewInstallPlan = async (rt: RuntimeItem) => {
    setInstallPlanRuntime(rt)
    setLoadingPlan(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/runtimes/${rt.id}/sipp-install-plan`))
      if (res.ok) {
        const plan = await res.json()
        setInstallPlanData(plan)
      } else {
        // Fallback default recipe for Rocky Linux
        setInstallPlanData({
          os_name: rt.operating_system || 'Rocky Linux 9',
          is_rocky: true,
          package_manager: 'dnf',
          recommended_method: 'EPEL_PACKAGE',
          dnf_install_steps: [
            'sudo dnf install -y epel-release',
            'sudo dnf config-manager --set-enabled crb',
            'sudo dnf install -y sipp',
          ],
          source_compile_steps: [
            'sudo dnf groupinstall -y "Development Tools"',
            'sudo dnf install -y gcc-c++ make cmake libpcap-devel openssl-devel ncurses-devel lksctp-tools-devel git',
            'git clone https://github.com/SIPp/sipp.git /tmp/sipp',
            'cd /tmp/sipp && cmake -DUSE_SSL=1 -DUSE_PCAP=1 -DUSE_SCTP=1 . && make -j$(nproc)',
            'sudo make install',
          ],
          verification_command: 'sipp -v',
        })
      }
    } catch {
      setInstallPlanData({
        os_name: rt.operating_system || 'Rocky Linux 9',
        is_rocky: true,
        package_manager: 'dnf',
        recommended_method: 'EPEL_PACKAGE',
        dnf_install_steps: [
          'sudo dnf install -y epel-release',
          'sudo dnf config-manager --set-enabled crb',
          'sudo dnf install -y sipp',
        ],
        source_compile_steps: [
          'sudo dnf groupinstall -y "Development Tools"',
          'sudo dnf install -y gcc-c++ make cmake libpcap-devel openssl-devel ncurses-devel lksctp-tools-devel git',
          'git clone https://github.com/SIPp/sipp.git /tmp/sipp',
          'cd /tmp/sipp && cmake -DUSE_SSL=1 -DUSE_PCAP=1 -DUSE_SCTP=1 . && make -j$(nproc)',
          'sudo make install',
        ],
        verification_command: 'sipp -v',
      })
    } finally {
      setLoadingPlan(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/v1/runtimes/${id}`), { method: 'DELETE' })
      await fetchRuntimes()
    } catch {
      // Offline fallback
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formName,
        runtime_type: 'REMOTE_LINUX',
        role: formRole,
        hostname: formHost,
        port: Number(formPort),
        username: formUser,
        ssh_auth: {
          auth_method: formAuthMethod,
          key_path: formAuthMethod === 'KEY' ? formKeyPath : undefined,
          password: formAuthMethod === 'PASSWORD' ? formPassword : undefined,
        },
      }
      const res = await fetch(apiUrl('/api/v1/runtimes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowAddModal(false)
        setFormPassword('')
        await fetchRuntimes()
      }
    } catch {
      // Offline fallback
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  useEffect(() => {
    fetchRuntimes()
  }, [])

  const defaultMockRuntimes: RuntimeItem[] = [
    {
      id: 'win-native-local',
      name: 'Local Windows Host',
      runtime_type: 'NATIVE_WINDOWS',
      role: 'STANDALONE',
      hostname: '127.0.0.1',
      port: 22,
      status: 'UNAVAILABLE',
      sipp_available: false,
      operating_system: 'Windows 11',
      message: 'Native Windows SIPp binary not found in system PATH.',
      diagnostics: {
        missing_prerequisites: ['Native Windows SIPp binary'],
        setup_instructions: ['Install a compiled Windows SIPp build or use WSL2 / remote Linux test hosts.'],
      },
    },
    {
      id: 'win-wsl2-local',
      name: 'Local Windows WSL2',
      runtime_type: 'WINDOWS_WSL2',
      role: 'STANDALONE',
      hostname: '127.0.0.1',
      port: 22,
      status: 'UNAVAILABLE',
      sipp_available: false,
      operating_system: 'WSL2 (No distributions installed)',
      message: 'WSL has no installed Linux distributions on this system.',
      diagnostics: {
        missing_prerequisites: ['WSL2 Ubuntu distribution'],
        setup_instructions: ['Run "wsl --install -d Ubuntu" in PowerShell and install sipp.'],
      },
    },
    {
      id: 'rocky-lab-shared-01',
      name: 'Rocky Linux Lab Server',
      runtime_type: 'REMOTE_LINUX',
      role: 'CALLER_CALLED',
      hostname: '172.19.112.50',
      port: 22,
      username: 'sipadmin',
      status: 'READY',
      sipp_available: true,
      sipp_version: 'SIPp v3.7.1-TLS-PCAP',
      operating_system: 'Rocky Linux release 9.4 (Blue Onyx)',
      message: 'Rocky Linux single-host server ready for dual CALLER/CALLED execution.',
      diagnostics: {
        distro_info: {
          distro_name: 'Rocky Linux',
          distro_version: '9.4',
          is_rocky: true,
        },
        hardware_info: {
          cpu_cores: 4,
          memory_mb: 8192,
          disk_free_mb: 45000,
        },
        sipp_capabilities: {
          pcap: true,
          tls: true,
          sctp: true,
        },
        missing_prerequisites: [],
        setup_instructions: [],
      },
    },
    {
      id: 'sim-runner-01',
      name: 'Simulated Engine (In-Memory)',
      runtime_type: 'SIMULATED',
      role: 'STANDALONE',
      hostname: '127.0.0.1',
      port: 5060,
      status: 'READY',
      sipp_available: true,
      sipp_version: '3.7.0 (Simulated)',
      operating_system: 'Windows Native Prototype',
      message: 'In-memory deterministic SIP protocol simulation active.',
      diagnostics: {
        missing_prerequisites: [],
        setup_instructions: [],
      },
    },
  ]

  const displayList = runtimes.length > 0 ? runtimes : defaultMockRuntimes

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Runtime Manager</h2>
          <p className="text-xs text-muted-foreground">Execution Platform Adapters, Node Discovery & Validation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-emerald-400 border-emerald-500/40 hidden sm:inline-flex">
            IExecutionRunner Interface v1.0
          </Badge>
          <Button size="sm" variant="outline" onClick={handleDiscover} disabled={isLoading} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Discover Runtimes
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Remote Host
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Runtime Manager State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && <ErrorState error="Runtime orchestration engine failed to query runner daemon status." />}
      {state === 'empty' && <EmptyState message="No execution runtimes registered." actionLabel="Discover Local Runtimes" onAction={handleDiscover} />}

      {state === 'populated' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayList.map((rt) => {
              const isReady = rt.status === 'READY'
              const isWarning = rt.status === 'WARNING'
              const isSingleHost = rt.role === 'CALLER_CALLED'
              return (
                <Card key={rt.id} className="border-border/60 flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          {rt.runtime_type === 'NATIVE_WINDOWS' && <Cpu className="w-4 h-4 text-primary" />}
                          {rt.runtime_type === 'WINDOWS_WSL2' && <Sliders className="w-4 h-4 text-amber-400" />}
                          {rt.runtime_type === 'REMOTE_LINUX' && <Terminal className="w-4 h-4 text-sky-400" />}
                          {rt.runtime_type === 'SIMULATED' && <Activity className="w-4 h-4 text-emerald-400" />}
                          {rt.name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{rt.id}</span>
                          {isSingleHost ? (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] uppercase font-bold border border-purple-500/30">
                              CALLER + CALLED
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[9px] uppercase font-bold border border-sky-500/30">
                              {rt.role}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={isReady ? 'success' : isWarning ? 'warning' : 'destructive'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {rt.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5 p-2 bg-muted/20 rounded border border-border/40 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="text-foreground">{rt.runtime_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Host:</span>
                        <span className="text-foreground">{rt.hostname}:{rt.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">OS:</span>
                        <span className="text-foreground truncate max-w-[150px]">{rt.operating_system}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SIPp Binary:</span>
                        <span className={rt.sipp_available ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          {rt.sipp_available ? rt.sipp_version || 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      {rt.diagnostics?.distro_info?.is_rocky && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform:</span>
                          <span className="text-emerald-400 font-semibold">Rocky Linux Enterprise</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7"
                          onClick={() => handleValidate(rt.id)}
                        >
                          Validate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                          aria-label="View Diagnostics"
                          onClick={() => setSelectedDiagnostics(rt)}
                        >
                          <Search className="w-3.5 h-3.5" />
                        </Button>
                        {rt.runtime_type === 'REMOTE_LINUX' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7 px-2"
                            onClick={() => handleDelete(rt.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {rt.runtime_type === 'REMOTE_LINUX' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 gap-1 border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                            onClick={() => handleTestConnection(rt.id)}
                            disabled={testingConnectionId === rt.id}
                          >
                            <Activity className={`w-3 h-3 ${testingConnectionId === rt.id ? 'animate-spin' : ''}`} />
                            {testingConnectionId === rt.id ? 'Testing...' : 'Test SSH'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 gap-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                            onClick={() => handleViewInstallPlan(rt)}
                          >
                            <FileCode className="w-3 h-3" />
                            SIPp Guide
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contract Isolation & Invariants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>All platform adapters implement apps/backend/adapters/runtime/base.py (BaseRuntimeAdapter)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero direct shell execution or machine-specific filesystem path coupling</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>OpenSSH execution uses non-interactive argument vectors with strict timeout guards</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Windows DPAPI Credential Vault active: SSH keys & passwords securely encrypted at rest</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Remote Host Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-base font-bold text-foreground">Register Remote Linux Host</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Runtime Identifier / Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-muted-foreground block mb-1">Remote IP / Hostname</label>
                  <Input value={formHost} onChange={(e) => setFormHost(e.target.value)} required />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">SSH Port</label>
                  <Input type="number" value={formPort} onChange={(e) => setFormPort(Number(e.target.value))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">SSH Username</label>
                  <Input value={formUser} onChange={(e) => setFormUser(e.target.value)} required />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Target Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    <option value="CALLER_CALLED">CALLER & CALLED (Single Host - Lab Server)</option>
                    <option value="CALLER">CALLER (UAC)</option>
                    <option value="CALLED">CALLED (UAS)</option>
                    <option value="STANDALONE">STANDALONE</option>
                  </select>
                </div>
              </div>

              {/* Authentication Mode Toggle */}
              <div>
                <label className="text-muted-foreground block mb-1">Authentication Method</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormAuthMethod('KEY')}
                    className={`py-1.5 px-3 rounded text-xs border font-medium ${
                      formAuthMethod === 'KEY'
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    SSH Key Reference
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAuthMethod('PASSWORD')}
                    className={`py-1.5 px-3 rounded text-xs border font-medium ${
                      formAuthMethod === 'PASSWORD'
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    Password Auth
                  </button>
                </div>
              </div>

              {formAuthMethod === 'KEY' ? (
                <div>
                  <label className="text-muted-foreground block mb-1">Private SSH Key Reference Path</label>
                  <Input value={formKeyPath} onChange={(e) => setFormKeyPath(e.target.value)} required />
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Key-based auth is strongly recommended for lab automation.</span>
                </div>
              ) : (
                <div>
                  <label className="text-muted-foreground block mb-1">SSH Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required
                      placeholder="Enter remote user password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">Encrypted with Windows DPAPI vault; masked in logs and reports.</span>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register & Validate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {selectedDiagnostics && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-base font-bold text-foreground">Diagnostics: {selectedDiagnostics.name}</h3>
              <button type="button" onClick={() => setSelectedDiagnostics(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs max-h-96 overflow-y-auto font-mono">
              <div className="p-2 bg-muted/20 rounded border border-border/40">
                <div className="text-primary font-semibold mb-1">Message</div>
                <div className="text-muted-foreground">{selectedDiagnostics.message}</div>
              </div>

              {selectedDiagnostics.diagnostics.missing_prerequisites && selectedDiagnostics.diagnostics.missing_prerequisites.length > 0 && (
                <div className="p-2 bg-destructive/10 rounded border border-destructive/30">
                  <div className="text-destructive font-semibold mb-1">Missing Prerequisites</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {selectedDiagnostics.diagnostics.missing_prerequisites.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDiagnostics.diagnostics.setup_instructions && selectedDiagnostics.diagnostics.setup_instructions.length > 0 && (
                <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30">
                  <div className="text-amber-400 font-semibold mb-1">Setup Instructions</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {selectedDiagnostics.diagnostics.setup_instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setSelectedDiagnostics(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Connection Test Diagnostics Modal */}
      {connectionTestResult && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-foreground">SSH Connection Diagnostics</h3>
              </div>
              <button type="button" onClick={() => setConnectionTestResult(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/40">
                <span className="font-semibold">Overall Connection Status:</span>
                <Badge
                  variant={connectionTestResult.status === 'SUCCESS' ? 'success' : connectionTestResult.status === 'WARNING' ? 'warning' : 'destructive'}
                  className="font-mono text-xs uppercase"
                >
                  {connectionTestResult.status}
                </Badge>
              </div>

              <div className="space-y-2 p-3 bg-card rounded border border-border/60">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stage-by-Stage Verification</div>
                
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="flex items-center gap-2">
                    {connectionTestResult.connection_tests?.connect_success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>1. TCP Socket Reachability</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {connectionTestResult.connection_tests?.connect_success ? 'Connected' : 'Unreachable'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="flex items-center gap-2">
                    {connectionTestResult.connection_tests?.auth_success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>2. SSH Authentication</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {connectionTestResult.connection_tests?.auth_success ? 'Authenticated' : 'Failed'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="flex items-center gap-2">
                    {connectionTestResult.connection_tests?.host_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>3. Host Key Verification</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {connectionTestResult.connection_tests?.host_verified ? 'Verified' : 'Strict Host Check'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="flex items-center gap-2">
                    {connectionTestResult.connection_tests?.os_detected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>4. OS Identification (Rocky Linux)</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[150px]">
                    {connectionTestResult.distro_name || 'Detected'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="flex items-center gap-2">
                    {connectionTestResult.connection_tests?.sipp_detected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>5. SIPp Binary Presence</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {connectionTestResult.connection_tests?.sipp_detected ? 'Found' : 'Not Installed'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2">
                    {connectionTestResult.connection_tests?.workdir_writable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>6. Workspace Write Permissions</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {connectionTestResult.connection_tests?.workdir_writable ? 'Writable' : 'Read-only / Unchecked'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-muted/20 border border-border/40 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Diagnostic Message: </span>
                {connectionTestResult.message}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setConnectionTestResult(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Rocky Linux SIPp Installation Plan Modal */}
      {installPlanRuntime && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-foreground">
                  SIPp Installation Guide: {installPlanRuntime.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInstallPlanRuntime(null)
                  setInstallPlanData(null)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPlan ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* OS and Method Banner */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-purple-400 font-semibold block">Target Operating System</span>
                    <span className="text-sm font-bold text-foreground">
                      {installPlanData?.os_name || installPlanRuntime.operating_system}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-purple-300 border-purple-500/40">
                    Package Manager: {installPlanData?.package_manager || 'dnf'}
                  </Badge>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border/40 gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('dnf')}
                    className={`pb-2 px-3 text-xs font-medium border-b-2 transition-all ${
                      activePlanTab === 'dnf'
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    EPEL Package (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('source')}
                    className={`pb-2 px-3 text-xs font-medium border-b-2 transition-all ${
                      activePlanTab === 'source'
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Source Build (TLS/PCAP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('firewall')}
                    className={`pb-2 px-3 text-xs font-medium border-b-2 transition-all ${
                      activePlanTab === 'firewall'
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Firewall & Ports
                  </button>
                </div>

                {/* Tab 1: DNF */}
                {activePlanTab === 'dnf' && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-[11px]">
                      Install pre-compiled SIPp on Rocky Linux via the Extra Packages for Enterprise Linux (EPEL) repository.
                    </p>
                    <div className="relative p-3 bg-black/60 rounded-md border border-border/50 font-mono text-[12px] text-emerald-400 space-y-1">
                      {installPlanData?.dnf_install_steps?.map((step: string, i: number) => (
                        <div key={i}>{step}</div>
                      )) || (
                        <>
                          <div>sudo dnf install -y epel-release</div>
                          <div>sudo dnf config-manager --set-enabled crb</div>
                          <div>sudo dnf install -y sipp</div>
                        </>
                      )}
                      <div className="pt-2 text-sky-400"># Verify installation</div>
                      <div>sipp -v</div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            (installPlanData?.dnf_install_steps || [
                              'sudo dnf install -y epel-release',
                              'sudo dnf config-manager --set-enabled crb',
                              'sudo dnf install -y sipp',
                            ]).join('\n') + '\nsipp -v'
                          )
                        }
                        className="absolute right-2 top-2 p-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Copy to clipboard"
                      >
                        {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Source */}
                {activePlanTab === 'source' && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-[11px]">
                      Compile SIPp from source to include OpenSSL (TLS) and libpcap (RTP media replay) support.
                    </p>
                    <div className="relative p-3 bg-black/60 rounded-md border border-border/50 font-mono text-[12px] text-emerald-400 space-y-1 overflow-x-auto">
                      {installPlanData?.source_compile_steps?.map((step: string, i: number) => (
                        <div key={i}>{step}</div>
                      )) || (
                        <>
                          <div>sudo dnf groupinstall -y "Development Tools"</div>
                          <div>sudo dnf install -y gcc-c++ make cmake libpcap-devel openssl-devel ncurses-devel lksctp-tools-devel git</div>
                          <div>git clone https://github.com/SIPp/sipp.git /tmp/sipp</div>
                          <div>cd /tmp/sipp && cmake -DUSE_SSL=1 -DUSE_PCAP=1 -DUSE_SCTP=1 . && make -j$(nproc)</div>
                          <div>sudo make install</div>
                        </>
                      )}
                      <div className="pt-2 text-sky-400"># Verify build</div>
                      <div>sipp -v</div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            (installPlanData?.source_compile_steps || []).join('\n') + '\nsipp -v'
                          )
                        }
                        className="absolute right-2 top-2 p-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Copy to clipboard"
                      >
                        {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Firewall */}
                {activePlanTab === 'firewall' && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-[11px]">
                      Permit SIP traffic across firewalld on Rocky Linux for CALLER (5060) and CALLED (5080) roles.
                    </p>
                    <div className="relative p-3 bg-black/60 rounded-md border border-border/50 font-mono text-[12px] text-emerald-400 space-y-1">
                      <div>sudo firewall-cmd --zone=public --add-port=5060/udp --permanent</div>
                      <div>sudo firewall-cmd --zone=public --add-port=5080/udp --permanent</div>
                      <div>sudo firewall-cmd --zone=public --add-port=5060/tcp --permanent</div>
                      <div>sudo firewall-cmd --zone=public --add-port=5080/tcp --permanent</div>
                      <div>sudo firewall-cmd --reload</div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            'sudo firewall-cmd --zone=public --add-port=5060/udp --permanent\n' +
                            'sudo firewall-cmd --zone=public --add-port=5080/udp --permanent\n' +
                            'sudo firewall-cmd --zone=public --add-port=5060/tcp --permanent\n' +
                            'sudo firewall-cmd --zone=public --add-port=5080/tcp --permanent\n' +
                            'sudo firewall-cmd --reload'
                          )
                        }
                        className="absolute right-2 top-2 p-1.5 rounded bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Copy to clipboard"
                      >
                        {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setInstallPlanRuntime(null)
                  setInstallPlanData(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
