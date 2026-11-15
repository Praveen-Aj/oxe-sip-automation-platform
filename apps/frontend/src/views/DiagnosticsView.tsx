import React, { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { DiagnosticEventCard, type DiagnosticEventItem } from '../components/DiagnosticEventCard'
import { Search, AlertTriangle, CheckCircle2, ShieldAlert, RotateCw, FileText } from 'lucide-react'

export interface DiagnosticsViewProps {
  initialExecutionId?: string
  onNavigate?: (pageId: string, context?: any) => void
}

export function DiagnosticsView({ initialExecutionId, onNavigate }: DiagnosticsViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [executionId, setExecutionId] = useState<string>(initialExecutionId || 'exec-demo-01')
  const [diagnostics, setDiagnostics] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchDiagnostics = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/diagnostics/${executionId}`))
      if (res.ok) {
        const data = await res.json()
        setDiagnostics(data)
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDiagnostics()
  }, [executionId])

  const defaultMockEvents: DiagnosticEventItem[] = [
    {
      id: 'diag-001',
      severity: 'ERROR',
      category: 'SIP_5XX_RESPONSE',
      sip_code: 503,
      affected_host: 'PBX',
      observed_fact: "Received 2 '503 Service Unavailable' response(s) from OXE PBX.",
      suspected_cause: 'OXE SIP trunk group DSP channel exhaustion, trunk group out of service, or routing failure.',
      recommended_action: "Check 'spit' trace on OXE CPU, verify trunk group TG-4 operational status in mgr, and inspect media gateway compressor availability.",
      log_excerpt: 'SIP/2.0 503 Service Unavailable\nCSeq: 1 INVITE\nServer: Alcatel-Lucent OmniPCX Enterprise\nReason: Q.850;cause=34;text="No circuit/channel available"',
    },
    {
      id: 'diag-002',
      severity: 'INFO',
      category: 'AUTHENTICATION_FAILURE',
      sip_code: 401,
      affected_host: 'CALLER',
      observed_fact: 'Digest challenge issued by OXE (401 Unauthorized).',
      suspected_cause: 'Standard SIP Digest authentication handshake (RFC 2617).',
      recommended_action: 'Ensure credentials match subscriber password in OXE SIP Gateway parameters.',
      log_excerpt: 'SIP/2.0 401 Unauthorized\nWWW-Authenticate: Digest realm="oxe.lab.alcatel", nonce="d3b07384d113edec"',
    },
    {
      id: 'diag-003',
      severity: 'WARNING',
      category: 'RETRANSMISSION',
      affected_host: 'CALLER',
      observed_fact: 'Detected 1 UDP retransmission timer firings (T1).',
      suspected_cause: 'Transient packet loss or high network latency between CALLER and PBX signaling port.',
      recommended_action: 'Verify physical switch port duplex, network latency, and MTU fragmentation.',
    },
  ]

  const events: DiagnosticEventItem[] = diagnostics?.events || defaultMockEvents
  const rootCause = diagnostics?.root_cause_summary || 'OXE Trunk Group or Media Gateway capacity constraint detected.'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Search className="w-5 h-5 text-sky-400" />
            SIP Diagnostics & Failure Analysis
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated detection of 4xx/5xx/6xx responses, Digest Auth failures, PRACK drops, and root causes
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-xs border-border/80 bg-muted/40 text-foreground">
            Target Execution: <strong className="text-sky-400 ml-1">{executionId}</strong>
          </Badge>
          <Button
            size="sm"
            onClick={fetchDiagnostics}
            disabled={isLoading}
            className="text-xs bg-muted hover:bg-muted/80 text-foreground border border-border gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Re-analyze
          </Button>
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

      <StateToggleBar state={state} onChange={setState} label="Diagnostics State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Failed to load diagnostic telemetry logs for this execution run."
          onRetry={fetchDiagnostics}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No diagnostic errors or protocol violations recorded for this execution."
          actionLabel="View Execution History"
          onAction={() => onNavigate && onNavigate('history')}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-6">
          {/* Root Cause Banner */}
          <Card className="bg-gradient-to-r from-card via-card to-rose-950/20 border-border text-foreground">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider block">
                  Root Cause Synthesis
                </span>
                <p className="text-sm font-semibold text-foreground mt-1">{rootCause}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Synthesized from {events.length} signaling events, response distributions, and SIPp logs.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Event Cards List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-foreground font-mono">
              Diagnostic Signaling Findings ({events.length})
            </div>
            {events.map((evt) => (
              <DiagnosticEventCard key={evt.id} event={evt} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
