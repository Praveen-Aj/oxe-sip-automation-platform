import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MetricCard } from '../components/MetricCard'
import { StatusBadge } from '../components/StatusBadge'
import { ResponseDistribution } from '../components/ResponseDistribution'
import { StateToggleBar, EmptyState, ErrorState } from '../components/StateToggleBar'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { App } from '../App'
import { DashboardView } from '../views/DashboardView'
import { ScenarioCapabilityBadge } from '../components/ScenarioCapabilityBadge'
import { ScenarioCard, type ScenarioItem } from '../components/ScenarioCard'
import { ConfigurationStep } from '../components/ConfigurationStep'
import { ConfigurationSummary } from '../components/ConfigurationSummary'
import { PreflightCheckCard } from '../components/PreflightCheckCard'
import { PreflightStatusPanel } from '../components/PreflightStatusPanel'
import { ValidationResultList } from '../components/ValidationResultList'
import { ScenarioCatalogueView } from '../views/ScenarioCatalogueView'
import { TestConfigView } from '../views/TestConfigView'
import { PreflightView } from '../views/PreflightView'

import { ExecutionStatusCard } from '../components/ExecutionStatusCard'
import { HostTelemetryPanel } from '../components/HostTelemetryPanel'
import { DiagnosticEventCard } from '../components/DiagnosticEventCard'
import { LiveMonitorView } from '../views/LiveMonitorView'
import { DiagnosticsView } from '../views/DiagnosticsView'
import { HistoryView } from '../views/HistoryView'
import { ReportsView } from '../views/ReportsView'
import { TestExecutionView } from '../views/TestExecutionView'
import { RuntimeManagerView } from '../views/RuntimeManagerView'
import { EnvironmentsView } from '../views/EnvironmentsView'

describe('Frontend Component Suite', () => {
  it('renders MetricCard with correct value and label', () => {
    render(<MetricCard label="Call Rate" value="15.5" subValue="Target: 10" variant="accent" />)
    expect(screen.getByText('Call Rate')).toBeInTheDocument()
    expect(screen.getByText('15.5')).toBeInTheDocument()
    expect(screen.getByText('Target: 10')).toBeInTheDocument()
  })

  it('renders StatusBadge with status text', () => {
    render(<StatusBadge status="READY" label="SYSTEM READY" />)
    expect(screen.getByText('SYSTEM READY')).toBeInTheDocument()
  })

  it('renders ResponseDistribution with calculated event percentages', () => {
    const dist = { '100 Trying': 30, '200 OK': 70 }
    render(<ResponseDistribution distribution={dist} />)
    expect(screen.getByText('100 Total Events')).toBeInTheDocument()
    expect(screen.getByText('100 Trying')).toBeInTheDocument()
    expect(screen.getByText('30 (30%)')).toBeInTheDocument()
    expect(screen.getByText('70 (70%)')).toBeInTheDocument()
  })

  it('renders StateToggleBar and handles state change callback', () => {
    const handleChange = vi.fn()
    render(<StateToggleBar state="populated" onChange={handleChange} label="Test View" />)
    expect(screen.getByText('Test View:')).toBeInTheDocument()
    expect(screen.getAllByText(/populated/i).length).toBeGreaterThan(0)

    const emptyBtn = screen.getByRole('button', { name: /empty/i })
    fireEvent.click(emptyBtn)
    expect(handleChange).toHaveBeenCalledWith('empty')
  })

  it('renders EmptyState and handles action callback', () => {
    const handleAction = vi.fn()
    render(<EmptyState message="No data available" actionLabel="Add Item" onAction={handleAction} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()

    const actionBtn = screen.getByRole('button', { name: /add item/i })
    fireEvent.click(actionBtn)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('renders ErrorState with retry callback', () => {
    const handleRetry = vi.fn()
    render(<ErrorState error="Connection timeout" onRetry={handleRetry} />)
    expect(screen.getByText('Failed to Load Data')).toBeInTheDocument()
    expect(screen.getByText('Connection timeout')).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('renders Button component variants and responds to clicks', () => {
    const handleClick = vi.fn()
    render(<Button variant="destructive" onClick={handleClick}>Abort</Button>)
    const btn = screen.getByRole('button', { name: /abort/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders Badge component with distinct variants', () => {
    render(<Badge variant="success">Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders Card with nested header and content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>Card content body</CardContent>
      </Card>
    )
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Card content body')).toBeInTheDocument()
  })

  it('renders App navigation sidebar and switches views on click', () => {
    render(<App />)
    expect(screen.getByText('OXE SIPp Automation')).toBeInTheDocument()
    expect(screen.getByText('System Dashboard')).toBeInTheDocument()

    // Click Environments tab
    const envBtn = screen.getByRole('button', { name: /environments/i })
    fireEvent.click(envBtn)
    expect(screen.getByText('Environments & Target Nodes')).toBeInTheDocument()

    // Click Scenario Catalogue tab
    const scenBtn = screen.getByRole('button', { name: /scenario catalogue/i })
    fireEvent.click(scenBtn)
    expect(screen.getByText('SIP Scenario Catalogue')).toBeInTheDocument()
  })

  it('renders DashboardView populated with telecom KPI metrics and compliance matrix', () => {
    const handleNavigate = vi.fn()
    render(<DashboardView onNavigate={handleNavigate} />)

    expect(screen.getByRole('heading', { name: 'System Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('OXE Core Link')).toBeInTheDocument()
    expect(screen.getByText('Active Target')).toBeInTheDocument()
    expect(screen.getByText('RFC 3261 (Core SIP)')).toBeInTheDocument()
    expect(screen.getByText('RFC 3262 (PRACK)')).toBeInTheDocument()
    expect(screen.getByText('RFC 2617 (Auth)')).toBeInTheDocument()

    // Test quick action navigation button
    const launchBtn = screen.getByRole('button', { name: /launch test run/i })
    fireEvent.click(launchBtn)
    expect(handleNavigate).toHaveBeenCalledWith('execution')
  })

  it('handles DashboardView state changes across loading, error, and empty', () => {
    const handleNavigate = vi.fn()
    render(<DashboardView onNavigate={handleNavigate} />)

    // Switch to Loading
    fireEvent.click(screen.getByRole('button', { name: 'loading' }))
    expect(screen.getByRole('status', { name: /loading dashboard metrics/i })).toBeInTheDocument()

    // Switch to Error
    fireEvent.click(screen.getByRole('button', { name: 'error' }))
    expect(screen.getByText('Failed to Load Data')).toBeInTheDocument()
    expect(screen.getByText(/127.0.0.1:8000/)).toBeInTheDocument()

    // Switch to Empty
    fireEvent.click(screen.getByRole('button', { name: 'empty' }))
    expect(screen.getByText('No Active Test Telemetry')).toBeInTheDocument()

    // Click action button in empty state
    const simBtn = screen.getByRole('button', { name: /start simulation/i })
    fireEvent.click(simBtn)
    expect(handleNavigate).toHaveBeenCalledWith('execution')
  })

  it('renders ScenarioCapabilityBadge for diverse protocol tags', () => {
    render(
      <div>
        <ScenarioCapabilityBadge type="UAC" />
        <ScenarioCapabilityBadge type="AUTH" />
        <ScenarioCapabilityBadge type="PRACK" />
        <ScenarioCapabilityBadge type="MEDIA" />
      </div>
    )
    expect(screen.getByText('UAC')).toBeInTheDocument()
    expect(screen.getByText('Auth (401/407)')).toBeInTheDocument()
    expect(screen.getByText('PRACK (100rel)')).toBeInTheDocument()
    expect(screen.getByText('SDP Media')).toBeInTheDocument()
  })

  it('renders ScenarioCard and invokes select and inspect callbacks', () => {
    const mockScenario: ScenarioItem = {
      id: 'invite-caller-auth-prack',
      name: 'INVITE Caller - Authentication + PRACK',
      filename: 'INVITE_Caller_Auth_PRACK.xml',
      role: 'UAC',
      description: 'Combined authentication and PRACK scenario.',
      categories: ['Authentication + PRACK'],
      methods: ['INVITE', 'ACK', 'BYE', 'PRACK'],
      authentication: true,
      prack: true,
      media: true,
      publish: false,
      csv_required: true,
      validation_status: 'VALID',
    }
    const handleSelect = vi.fn()
    const handleInspect = vi.fn()

    render(
      <ScenarioCard
        scenario={mockScenario}
        onSelect={handleSelect}
        onInspectXml={handleInspect}
      />
    )

    expect(screen.getByText('INVITE Caller - Authentication + PRACK')).toBeInTheDocument()
    expect(screen.getByText(/Combined authentication and PRACK/)).toBeInTheDocument()
    expect(screen.getByText('INVITE_Caller_Auth_PRACK.xml')).toBeInTheDocument()

    // Trigger inspect
    fireEvent.click(screen.getByRole('button', { name: /inspect xml/i }))
    expect(handleInspect).toHaveBeenCalledWith(mockScenario)

    // Trigger select
    fireEvent.click(screen.getByRole('button', { name: /configure/i }))
    expect(handleSelect).toHaveBeenCalledWith(mockScenario)
  })

  it('renders ConfigurationStep and highlights active step', () => {
    const steps = [
      { id: 1, title: 'Environment', subtitle: 'Target OXE' },
      { id: 2, title: 'Scenario', subtitle: 'Select scenario' },
    ]
    render(<ConfigurationStep steps={steps} currentStep={1} />)
    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getByText('Scenario')).toBeInTheDocument()
  })

  it('renders ConfigurationSummary with traffic and protocol parameters', () => {
    render(
      <ConfigurationSummary
        scenarioName="INVITE_Caller_Auth_PRACK.xml"
        environmentName="OXE Lab Staging"
        callerRange="55001-55010"
        calledRange="55011-55020"
        callRate={15}
        callCount={100}
        transport="UDP / 5060"
        authEnabled={true}
        prackEnabled={true}
        estimatedDuration="7 seconds"
      />
    )
    expect(screen.getByText('Execution Configuration Summary')).toBeInTheDocument()
    expect(screen.getByText(/55001-55010/)).toBeInTheDocument()
    expect(screen.getByText(/15 CPS \/ 100 total calls/)).toBeInTheDocument()
  })

  it('renders PreflightCheckCard and displays blocker badge and remediation', () => {
    render(
      <PreflightCheckCard
        check={{
          category: 'RUNTIME_CALLER',
          name: 'CALLER Runtime Host',
          status: 'FAIL',
          is_blocker: true,
          message: 'SIPp binary not found',
          remediation: 'Install SIPp v3.7.x on target host.',
        }}
      />
    )
    expect(screen.getByText('CALLER Runtime Host')).toBeInTheDocument()
    expect(screen.getByText('BLOCKER')).toBeInTheDocument()
    expect(screen.getByText(/Install SIPp v3.7.x/)).toBeInTheDocument()
  })

  it('renders PreflightStatusPanel in READY and BLOCKED modes', () => {
    const handleReval = vi.fn()
    const handleProceed = vi.fn()

    const { rerender } = render(
      <PreflightStatusPanel
        isReady={true}
        overallStatus="READY"
        totalChecks={6}
        passedCount={6}
        warningCount={0}
        blockerCount={0}
        onRevalidate={handleReval}
        onProceed={handleProceed}
      />
    )
    expect(screen.getByText('READY FOR EXECUTION')).toBeInTheDocument()

    // Rerender blocked
    rerender(
      <PreflightStatusPanel
        isReady={false}
        overallStatus="BLOCKED"
        totalChecks={6}
        passedCount={4}
        warningCount={0}
        blockerCount={2}
        onRevalidate={handleReval}
      />
    )
    expect(screen.getByText('BLOCKED – RESOLVE VALIDATION ISSUES')).toBeInTheDocument()
  })

  it('renders ValidationResultList and filters checks', () => {
    const checks = [
      { category: 'ENV', name: 'PBX IP', status: 'PASS' as const, is_blocker: false, message: 'Valid' },
      { category: 'PORT', name: 'Port 5060', status: 'WARNING' as const, is_blocker: false, message: 'Port busy' },
      { category: 'CALLER', name: 'SIPp Binary', status: 'FAIL' as const, is_blocker: true, message: 'Missing' },
    ]
    render(<ValidationResultList checks={checks} />)
    expect(screen.getByText('PBX IP')).toBeInTheDocument()
    expect(screen.getByText('Port 5060')).toBeInTheDocument()
    expect(screen.getByText('SIPp Binary')).toBeInTheDocument()

    // Filter by BLOCKERS
    fireEvent.click(screen.getByRole('button', { name: 'BLOCKERS' }))
    expect(screen.queryByText('PBX IP')).not.toBeInTheDocument()
    expect(screen.getByText('SIPp Binary')).toBeInTheDocument()
  })

  it('renders ExecutionStatusCard and HostTelemetryPanel', () => {
    render(
      <ExecutionStatusCard
        executionId="exec-tst-01"
        mode="SIMULATED"
        state="RUNNING"
        environmentName="Local Lab"
        scenarioName="INVITE_Caller"
        callRate={15}
        callCount={100}
        durationSeconds={12}
      />
    )
    expect(screen.getByText('Execution exec-tst-01')).toBeInTheDocument()
    expect(screen.getByText('SIMULATED MODE')).toBeInTheDocument()

    render(
      <HostTelemetryPanel
        role="CALLER"
        hostname="172.19.112.50"
        status="RUNNING"
        pid={14201}
        isAlive={true}
        totalEvents={50}
      />
    )
    expect(screen.getByText(/CALLER Host/i)).toBeInTheDocument()
    expect(screen.getByText('PID 14201')).toBeInTheDocument()
  })

  it('renders DiagnosticEventCard with severity styling', () => {
    render(
      <DiagnosticEventCard
        event={{
          id: 'diag-tst',
          severity: 'ERROR',
          category: 'SIP_5XX_RESPONSE',
          sip_code: 503,
          affected_host: 'PBX',
          observed_fact: '503 Service Unavailable received',
          suspected_cause: 'DSP exhaustion',
          recommended_action: 'Check mgr',
        }}
      />
    )
    expect(screen.getByText(/SIP_5XX_RESPONSE/i)).toBeInTheDocument()
    expect(screen.getByText('503 Service Unavailable received')).toBeInTheDocument()
  })

  it('renders LiveMonitorView and TestExecutionView', () => {
    render(<LiveMonitorView initialExecutionId="exec-tst-mon" />)
    expect(screen.getByText(/Live Execution & Telemetry Monitor/i)).toBeInTheDocument()

    render(<TestExecutionView />)
    expect(screen.getByText(/Execution Launch Control/i)).toBeInTheDocument()
    expect(screen.getByText(/SIMULATED EXECUTION/i)).toBeInTheDocument()
  })

  it('renders HistoryView and ReportsView', () => {
    render(<HistoryView />)
    expect(screen.getByText(/Execution History & Test Runs/i)).toBeInTheDocument()

    render(<ReportsView initialExecutionId="exec-rep-tst" />)
    expect(screen.getByText(/Execution Reports & Audit Exports/i)).toBeInTheDocument()
  })

  it('renders RuntimeManagerView with single-host role and connection test controls', () => {
    render(<RuntimeManagerView />)
    expect(screen.getByText('Runtime Manager')).toBeInTheDocument()
    expect(screen.getByText('Rocky Linux Lab Server')).toBeInTheDocument()
    expect(screen.getByText('CALLER + CALLED')).toBeInTheDocument()
    expect(screen.getByText('Test SSH')).toBeInTheDocument()
    expect(screen.getByText('SIPp Guide')).toBeInTheDocument()
  })

  it('renders EnvironmentsView with single-host topology and import/export controls', () => {
    render(<EnvironmentsView />)
    expect(screen.getByText('Environments & Target Nodes')).toBeInTheDocument()
    expect(screen.getByText('Hardware Lab OXE Primary')).toBeInTheDocument()
    expect(screen.getByText('Import Profile')).toBeInTheDocument()
    expect(screen.getAllByText('Export Profile').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Single-Host Topology').length).toBeGreaterThan(0)
  })
})
