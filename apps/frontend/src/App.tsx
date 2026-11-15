import React, { useState, useEffect } from 'react'
import { StatusBadge } from './components/StatusBadge'
import { apiFetch } from './lib/api'
import { DashboardView } from './views/DashboardView'
import { EnvironmentsView } from './views/EnvironmentsView'
import { RuntimeManagerView } from './views/RuntimeManagerView'
import { ScenarioCatalogueView } from './views/ScenarioCatalogueView'
import { TestConfigView } from './views/TestConfigView'
import { PreflightView } from './views/PreflightView'
import { TestExecutionView } from './views/TestExecutionView'
import { LiveMonitorView } from './views/LiveMonitorView'
import { DiagnosticsView } from './views/DiagnosticsView'
import { HistoryView } from './views/HistoryView'
import { ReportsView } from './views/ReportsView'
import { PbxManagementView } from './views/PbxManagementView'
import { SettingsView } from './views/SettingsView'
import {
  LayoutDashboard,
  Network,
  Cpu,
  BookOpen,
  Sliders,
  CheckSquare,
  PlayCircle,
  Activity,
  Search,
  History,
  FileCheck,
  Server,
  Settings,
  Radio,
  Menu,
  X,
} from 'lucide-react'

export type PageId =
  | 'dashboard'
  | 'environments'
  | 'runtime'
  | 'scenarios'
  | 'config'
  | 'preflight'
  | 'execution'
  | 'monitor'
  | 'diagnostics'
  | 'history'
  | 'reports'
  | 'pbx'
  | 'settings'

export interface NavItem {
  id: PageId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Infrastructure',
    items: [
      { id: 'environments', label: 'Environments', icon: Network },
      { id: 'runtime', label: 'Runtime Manager', icon: Cpu },
      { id: 'pbx', label: 'PBX Management', icon: Server },
    ],
  },
  {
    title: 'Scenarios & Design',
    items: [
      { id: 'scenarios', label: 'Scenario Catalogue', icon: BookOpen },
      { id: 'config', label: 'Test Configuration', icon: Sliders },
    ],
  },
  {
    title: 'Execution & Live',
    items: [
      { id: 'preflight', label: 'Preflight Checks', icon: CheckSquare },
      { id: 'execution', label: 'Test Execution', icon: PlayCircle },
      { id: 'monitor', label: 'Live Monitor', icon: Activity, badge: 'Live' },
    ],
  },
  {
    title: 'Diagnostics & Reports',
    items: [
      { id: 'diagnostics', label: 'SIP Diagnostics', icon: Search },
      { id: 'history', label: 'Test History', icon: History },
      { id: 'reports', label: 'Reports & Audits', icon: FileCheck },
    ],
  },
  {
    title: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: Settings }],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((sec) => sec.items)

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [backendStatus, setBackendStatus] = useState<'READY' | 'OFFLINE'>('READY')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [workflowContext, setWorkflowContext] = useState<{
    environmentId?: string
    scenarioId?: string
    configurationId?: string
    scenario?: any
    executionId?: string
  }>({})

  const handleNavigateWithContext = (page: PageId, ctx?: any) => {
    if (ctx) {
      setWorkflowContext((prev) => ({ ...prev, ...ctx }))
    }
    setActivePage(page)
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    apiFetch('/api/v1/system/health')
      .then((res) => (res.ok ? setBackendStatus('READY') : setBackendStatus('OFFLINE')))
      .catch(() => setBackendStatus('OFFLINE'))
  }, [])

  return (
    <div className="flex h-screen bg-background text-foreground antialiased font-sans">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-border/60 bg-card flex flex-col shrink-0 transition-transform duration-200 md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-tight">OXE SIPp Automation</h1>
              <p className="text-[10px] text-muted-foreground font-mono">Cross-Platform Suite</p>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isSelected = activePage === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigateWithContext(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isSelected
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border/40 bg-card/60 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Backend:</span>
            <span className={backendStatus === 'READY' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {backendStatus}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
            <span>Branch: feature/phase3a</span>
            <span>OS: Windows</span>
          </div>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="h-14 border-b border-border/60 bg-card/40 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-1.5 rounded border border-border text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold hidden sm:inline">
              OXE Test Lab
            </span>
            <span className="text-border hidden sm:inline">/</span>
            <span className="text-xs font-semibold text-foreground">
              {NAV_ITEMS.find((n) => n.id === activePage)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status="READY" label="Simulated Runner Active" />
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activePage === 'dashboard' && <DashboardView onNavigate={(p) => handleNavigateWithContext(p as PageId)} />}
          {activePage === 'environments' && <EnvironmentsView />}
          {activePage === 'runtime' && <RuntimeManagerView />}
          {activePage === 'scenarios' && (
            <ScenarioCatalogueView
              onSelectScenario={(sc) => setWorkflowContext((prev) => ({ ...prev, scenario: sc, scenarioId: sc.id }))}
              onNavigate={(page) => handleNavigateWithContext(page as PageId)}
            />
          )}
          {activePage === 'config' && (
            <TestConfigView
              initialScenario={workflowContext.scenario}
              onNavigate={(page, ctx) => handleNavigateWithContext(page as PageId, ctx)}
            />
          )}
          {activePage === 'preflight' && (
            <PreflightView
              initialEnvironmentId={workflowContext.environmentId}
              initialScenarioId={workflowContext.scenarioId}
              initialConfigurationId={workflowContext.configurationId}
              onNavigate={(page) => handleNavigateWithContext(page as PageId)}
            />
          )}
          {activePage === 'execution' && (
            <TestExecutionView
              initialEnvironmentId={workflowContext.environmentId}
              initialScenarioId={workflowContext.scenarioId}
              initialConfigurationId={workflowContext.configurationId}
              onNavigate={(page, ctx) => handleNavigateWithContext(page as PageId, ctx)}
            />
          )}
          {activePage === 'monitor' && (
            <LiveMonitorView
              initialExecutionId={workflowContext.executionId}
              onNavigate={(page, ctx) => handleNavigateWithContext(page as PageId, ctx)}
            />
          )}
          {activePage === 'diagnostics' && (
            <DiagnosticsView
              initialExecutionId={workflowContext.executionId}
              onNavigate={(page, ctx) => handleNavigateWithContext(page as PageId, ctx)}
            />
          )}
          {activePage === 'history' && (
            <HistoryView onNavigate={(page, ctx) => handleNavigateWithContext(page as PageId, ctx)} />
          )}
          {activePage === 'reports' && (
            <ReportsView
              initialExecutionId={workflowContext.executionId}
              onNavigate={(page) => handleNavigateWithContext(page as PageId)}
            />
          )}
          {activePage === 'pbx' && <PbxManagementView />}
          {activePage === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  )
}

export default App
