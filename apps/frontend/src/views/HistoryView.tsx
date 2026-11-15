import React, { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { History, Eye, FileText, Search, Play, ArrowRight, RotateCw } from 'lucide-react'

export interface HistoryViewProps {
  onNavigate?: (pageId: string, context?: any) => void
}

export function HistoryView({ onNavigate }: HistoryViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [executions, setExecutions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterMode, setFilterMode] = useState<'ALL' | 'SIMULATED' | 'PHYSICAL'>('ALL')

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/executions'))
      if (res.ok) {
        const data = await res.json()
        setExecutions(data)
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const defaultMockHistory = [
    {
      id: 'exec-sim-01',
      mode: 'SIMULATED',
      state: 'COMPLETED',
      environment_id: 'env-local-simulation',
      scenario_id: 'invite-caller-auth-prack',
      total_calls: 100,
      successful_calls: 98,
      failed_calls: 2,
      duration_seconds: 10.2,
      created_at: '2026-11-14T23:50:00Z',
    },
    {
      id: 'exec-sim-02',
      mode: 'SIMULATED',
      state: 'CANCELLED',
      environment_id: 'env-local-simulation',
      scenario_id: 'register',
      total_calls: 40,
      successful_calls: 40,
      failed_calls: 0,
      duration_seconds: 4.1,
      created_at: '2026-11-14T23:10:00Z',
    },
    {
      id: 'exec-sim-03',
      mode: 'SIMULATED',
      state: 'COMPLETED',
      environment_id: 'env-lab-oxe-primary',
      scenario_id: 'invite-caller-prack',
      total_calls: 200,
      successful_calls: 200,
      failed_calls: 0,
      duration_seconds: 19.8,
      created_at: '2026-11-14T22:30:00Z',
    },
  ]

  const list = executions.length > 0 ? executions : defaultMockHistory
  const filteredList = list.filter((item) => {
    if (filterMode === 'ALL') return true
    return item.mode === filterMode
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            Execution History & Test Runs
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of all executed test configurations, telemetry snapshots, and outcomes
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-xs border-border/80 bg-muted/40 text-foreground">
            Total Runs: <strong className="text-sky-400 ml-1">{list.length}</strong>
          </Badge>
          <Button
            size="sm"
            onClick={fetchHistory}
            disabled={isLoading}
            className="text-xs bg-muted hover:bg-muted/80 text-foreground border border-border gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="History State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Failed to load historical test executions from database."
          onRetry={fetchHistory}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No test executions recorded yet in database."
          actionLabel="Launch First Test"
          onAction={() => onNavigate && onNavigate('execution')}
        />
      )}

      {state === 'populated' && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex gap-1.5 border-b border-border/80 pb-2">
            {(['ALL', 'SIMULATED', 'PHYSICAL'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                  filterMode === m
                    ? 'bg-sky-600 text-white'
                    : 'bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* History Table */}
          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-left text-xs font-mono text-muted-foreground">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Execution ID</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Scenario</th>
                  <th className="py-2.5 px-3">Total / OK</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-400">{item.id}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                          item.mode === 'SIMULATED'
                            ? 'bg-sky-950 border border-sky-800 text-sky-300'
                            : 'bg-purple-950 border border-purple-800 text-purple-300'
                        }`}
                      >
                        {item.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                          item.state === 'COMPLETED'
                            ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                            : 'bg-rose-950 border border-rose-800 text-rose-300'
                        }`}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground">{item.scenario_id}</td>
                    <td className="py-2.5 px-3 text-foreground">
                      {item.total_calls} / <span className="text-emerald-400">{item.successful_calls}</span>
                    </td>
                    <td className="py-2.5 px-3">{item.duration_seconds}s</td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      {onNavigate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate('diagnostics', { executionId: item.id })}
                          className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Search className="w-3 h-3 mr-1" /> Diag
                        </Button>
                      )}
                      {onNavigate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate('reports', { executionId: item.id })}
                          className="h-6 text-[11px] px-2 text-sky-400 hover:text-sky-300"
                        >
                          <FileText className="w-3 h-3 mr-1" /> Report
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
