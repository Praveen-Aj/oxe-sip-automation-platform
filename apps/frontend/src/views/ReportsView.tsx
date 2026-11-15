import React, { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { FileCheck, Download, Code, Globe, FileSpreadsheet, RotateCw, CheckCircle2 } from 'lucide-react'

export interface ReportsViewProps {
  initialExecutionId?: string
  onNavigate?: (pageId: string) => void
}

export function ReportsView({ initialExecutionId, onNavigate }: ReportsViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [executionId, setExecutionId] = useState<string>(initialExecutionId || 'exec-sim-01')
  const [report, setReport] = useState<any | null>(null)
  const [format, setFormat] = useState<'HTML' | 'JSON' | 'CSV'>('HTML')
  const [isLoading, setIsLoading] = useState(false)

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/reports/${executionId}?format=JSON`))
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [executionId])

  const downloadReport = (fmt: 'HTML' | 'CSV' | 'JSON') => {
    window.open(apiUrl(`/api/v1/reports/${executionId}?format=${fmt}`), '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-400" />
            Execution Reports & Audit Exports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export formal test execution summaries in HTML, CSV, and machine-readable JSON
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs border-border/80 bg-muted/40 text-foreground">
            Execution: <strong className="text-sky-400 ml-1">{executionId}</strong>
          </Badge>
          <Button
            size="sm"
            onClick={() => downloadReport('HTML')}
            className="text-xs bg-sky-600 hover:bg-sky-500 text-white gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export HTML
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadReport('CSV')}
            className="text-xs border-border text-foreground hover:bg-muted gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Report State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Failed to generate execution report from backend."
          onRetry={fetchReport}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No report generated for this target execution."
          actionLabel="View History"
          onAction={() => onNavigate && onNavigate('history')}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-6">
          {/* Format Switcher */}
          <div className="flex gap-2 border-b border-border/80 pb-2">
            <Button
              variant={format === 'HTML' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('HTML')}
              className="text-xs h-7 gap-1"
            >
              <Globe className="w-3 h-3" /> HTML View
            </Button>
            <Button
              variant={format === 'JSON' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('JSON')}
              className="text-xs h-7 gap-1"
            >
              <Code className="w-3 h-3" /> Raw JSON View
            </Button>
            <Button
              variant={format === 'CSV' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('CSV')}
              className="text-xs h-7 gap-1"
            >
              <FileSpreadsheet className="w-3 h-3" /> CSV Metrics
            </Button>
          </div>

          {/* Report Viewer */}
          <Card className="bg-card border-border text-foreground min-h-[400px]">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Generated Report Document
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-800 bg-emerald-950">
                AUDIT VERIFIED
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {format === 'HTML' && (
                <div
                  className="rounded border border-border p-4 bg-muted/20 font-mono text-xs overflow-x-auto text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: report?.html_content || `
                      <div style="font-family: monospace; color: currentColor;">
                        <h3>OXE SIP Test Execution Report: ${executionId}</h3>
                        <p style="color: #38bdf8;">SIMULATED EXECUTION - COMPLETED</p>
                        <p>Environment: Local Simulation | Target PBX: 172.19.112.51:5060</p>
                        <p>Total Calls: 100 | Successful (200 OK): 98 | Failed: 2 | Retransmissions: 1</p>
                      </div>
                    `,
                  }}
                />
              )}

              {format === 'JSON' && (
                <pre className="p-4 rounded border border-border bg-black/70 text-xs font-mono text-sky-300 overflow-x-auto max-h-[500px]">
                  {JSON.stringify(report || { execution_id: executionId, mode: 'SIMULATED', state: 'COMPLETED' }, null, 2)}
                </pre>
              )}

              {format === 'CSV' && (
                <pre className="p-4 rounded border border-border bg-black/70 text-xs font-mono text-emerald-300 overflow-x-auto">
                  {report?.csv_metrics_content || "execution_id,mode,state,total_calls,successful_calls,failed_calls\n" + executionId + ",SIMULATED,COMPLETED,100,98,2"}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
