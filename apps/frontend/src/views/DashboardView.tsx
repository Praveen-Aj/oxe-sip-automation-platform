import { useState } from 'react'
import { StateToggleBar, type PageState } from '../components/StateToggleBar'
import { MetricCard } from '../components/MetricCard'
import { StatusBadge } from '../components/StatusBadge'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { MOCK_ENVIRONMENTS, MOCK_HISTORY } from '../mock/pageData'
import {
  Activity,
  Server,
  Radio,
  Shield,
  CheckCircle2,
  Play,
  RotateCw,
  Cpu,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  FileText,
  Network
} from 'lucide-react'

export interface DashboardViewProps {
  onNavigate?: (pageId: any) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now')

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      setLastRefreshed(new Date().toLocaleTimeString())
    }, 600)
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">System Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            OXE SIPp Automation Architecture & Execution Health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/40 text-foreground">
            Topology: <span className="text-sky-400 font-semibold ml-1">TG-4 / 55000-55999</span>
          </Badge>
          <StatusBadge status="READY" label="Simulated Engine Active" />
        </div>
      </div>

      {/* State Toggle for Comprehensive Quality Verification */}
      <StateToggleBar state={state} onChange={setState} label="Dashboard State" />

      {/* Loading State */}
      {state === 'loading' && (
        <div role="status" aria-label="Loading dashboard metrics" className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted/40 border border-border/60 rounded-lg p-4" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted/40 border border-border/60 rounded-lg p-4" />
            <div className="h-64 bg-muted/40 border border-border/60 rounded-lg p-4" />
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center p-10 text-center border border-rose-900/50 rounded-lg bg-rose-950/20 text-rose-200 space-y-4">
          <div className="p-3 bg-rose-950/80 rounded-full border border-rose-800 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Failed to Load Data</h3>
            <p className="text-xs text-rose-400/90 font-mono">
              Connection to orchestrator backend timed out at 127.0.0.1:8000
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Please ensure the FastAPI service is running, or verify local loopback network accessibility.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState('populated')}
              className="text-xs border-border hover:bg-muted"
            >
              Retry Connection
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setState('populated')}
              className="text-xs bg-muted hover:bg-muted/80 text-foreground"
            >
              Switch to Fallback Telemetry
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {state === 'empty' && (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-muted/10 space-y-4">
          <div className="p-3 bg-muted/40 rounded-full border border-border text-muted-foreground">
            <Layers className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-sm font-semibold text-foreground">No Active Test Telemetry</h3>
            <p className="text-xs text-muted-foreground">
              No system telemetry or historical test runs recorded yet.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (onNavigate) onNavigate('execution')
                else setState('populated')
              }}
              className="text-xs bg-primary text-primary-foreground font-medium"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start Simulation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onNavigate) onNavigate('environments')
                else setState('populated')
              }}
              className="text-xs border-border"
            >
              Configure Environment
            </Button>
          </div>
        </div>
      )}

      {/* Populated State */}
      {state === 'populated' && (
        <>
          {/* Action & Data Provenance Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-card border border-border text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-foreground font-medium">Orchestrator Online</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono text-[11px]">Last sync: {lastRefreshed}</span>
              <span className="hidden md:inline-block px-1.5 py-0.2 rounded bg-sky-950/80 border border-sky-800/60 text-[10px] text-sky-300 font-mono">
                SIMULATED RUNNER
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 text-[11px] px-2.5 border-border text-foreground hover:bg-muted"
              >
                <RotateCw className={`w-3 h-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Link
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onNavigate && onNavigate('execution')}
                className="h-7 text-[11px] px-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium"
              >
                <Play className="w-3 h-3 mr-1.5" />
                Launch Test Run
              </Button>
            </div>
          </div>

          {/* Primary KPI Metrics Grid */}
          <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="OXE Core Link"
              value="Reachable"
              subValue="172.19.112.51 (Port 5060)"
              variant="success"
              icon={<Server className="w-4 h-4 text-emerald-400" />}
            />
            <MetricCard
              label="Active Target"
              value="Lab PBX"
              subValue="Trunk Group 4 / 55000-55999"
              variant="accent"
              icon={<Radio className="w-4 h-4 text-sky-400" />}
            />
            <MetricCard
              label="Protocol Modes"
              value="Auth + PRACK"
              subValue="RFC3261, 3262, 2617"
              variant="default"
              icon={<Shield className="w-4 h-4 text-indigo-400" />}
            />
            <MetricCard
              label="Engine State"
              value="Simulated"
              subValue="Windows Native Runner"
              variant="success"
              icon={<Activity className="w-4 h-4 text-emerald-400" />}
            />
          </section>

          {/* Main Telecom Monitoring & History Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Configured Environments & Topology Nodes */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Network className="w-4 h-4 text-sky-400" />
                    Configured Test Environments
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate && onNavigate('environments')}
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                >
                  Manage <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {MOCK_ENVIRONMENTS.map((env) => (
                  <div
                    key={env.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border/80 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">{env.name}</span>
                        {env.id.includes('simulated') && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-950 border border-purple-800 text-purple-300">
                            DEMO
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          env.status === 'healthy'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {env.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground/70">Caller:</span> {env.callerHost}
                      </div>
                      <div>
                        <span className="text-muted-foreground/70">Called:</span> {env.calledHost}
                      </div>
                      <div>
                        <span className="text-muted-foreground/70">OXE PBX:</span> {env.oxeHost}:5060
                      </div>
                      <div>
                        <span className="text-muted-foreground/70">Auth User:</span> {env.sshUser}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right Card: Recent Test Executions & Quality Gate Telemetry */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Recent Test Executions
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate && onNavigate('history')}
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                >
                  View All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {MOCK_HISTORY.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border/80 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-xs text-foreground">{item.scenario}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-y-1 text-[11px] font-mono text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      <span>{item.timestamp}</span>
                      <span>
                        <strong className="text-foreground">{item.totalCalls}</strong> calls @{' '}
                        <strong className="text-sky-400">{item.cps}</strong> cps
                      </span>
                      <span>
                        Duration: <strong className="text-foreground">{item.duration}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Protocol Compliance & Standards Matrix */}
          <Card className="bg-card border-border">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Alcatel-Lucent OmniPCX Enterprise SIP Compliance Standards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-muted/30 border border-border">
                  <div className="font-semibold text-foreground">RFC 3261 (Core SIP)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">INVITE, ACK, BYE, CANCEL</div>
                  <Badge variant="outline" className="mt-2 text-[10px] text-emerald-400 border-emerald-800/60 bg-emerald-950/50">
                    Compliant (Monotonic CSeq)
                  </Badge>
                </div>

                <div className="p-2.5 rounded bg-muted/30 border border-border">
                  <div className="font-semibold text-foreground">RFC 3262 (PRACK)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">100rel Provisional Ack</div>
                  <Badge variant="outline" className="mt-2 text-[10px] text-emerald-400 border-emerald-800/60 bg-emerald-950/50">
                    Active (180/183 RSeq)
                  </Badge>
                </div>

                <div className="p-2.5 rounded bg-muted/30 border border-border">
                  <div className="font-semibold text-foreground">RFC 2617 (Auth)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Digest MD5 Challenges</div>
                  <Badge variant="outline" className="mt-2 text-[10px] text-emerald-400 border-emerald-800/60 bg-emerald-950/50">
                    401 / 407 Handled
                  </Badge>
                </div>

                <div className="p-2.5 rounded bg-muted/30 border border-border">
                  <div className="font-semibold text-foreground">OXE QMCDU Routing</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Trunk Group 4 Dialplan</div>
                  <Badge variant="outline" className="mt-2 text-[10px] text-sky-400 border-sky-800/60 bg-sky-950/50">
                    Verified (55000-55999)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
