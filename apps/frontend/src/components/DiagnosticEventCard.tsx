import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { AlertTriangle, AlertCircle, Info, ChevronRight, HelpCircle } from 'lucide-react'

export interface DiagnosticEventItem {
  id: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  category: string
  sip_code?: number
  affected_host: string
  observed_fact: string
  suspected_cause: string
  recommended_action: string
  log_excerpt?: string
}

export interface DiagnosticEventCardProps {
  event: DiagnosticEventItem
}

export const DiagnosticEventCard: React.FC<DiagnosticEventCardProps> = ({ event }) => {
  const isError = event.severity === 'ERROR' || event.severity === 'CRITICAL'
  const isWarning = event.severity === 'WARNING'

  return (
    <Card
      className={`border text-slate-100 ${
        isError
          ? 'bg-rose-950/20 border-rose-800/80'
          : isWarning
          ? 'bg-amber-950/20 border-amber-800/80'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <CardHeader className="py-2.5 px-4 border-b border-slate-800/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : isWarning ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <Info className="w-4 h-4 text-sky-400" />
          )}
          <CardTitle className="text-xs font-bold text-slate-200">
            {event.category} {event.sip_code ? `(SIP ${event.sip_code})` : ''}
          </CardTitle>
          <span className="text-[10px] font-mono text-slate-400">Host: [{event.affected_host}]</span>
        </div>
        <Badge
          variant="outline"
          className={`font-mono text-[9px] uppercase ${
            isError
              ? 'bg-rose-950 border-rose-700 text-rose-300'
              : isWarning
              ? 'bg-amber-950 border-amber-700 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          {event.severity}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5 text-xs font-mono">
        <div>
          <span className="text-slate-500 font-semibold block mb-0.5">Observed Fact:</span>
          <p className="text-slate-200">{event.observed_fact}</p>
        </div>

        <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80 space-y-1">
          <span className="text-amber-400/90 font-semibold block">Suspected Cause:</span>
          <p className="text-slate-300">{event.suspected_cause}</p>
        </div>

        <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-800/60 space-y-1">
          <span className="text-emerald-400 font-semibold block">Recommended Action:</span>
          <p className="text-slate-300">{event.recommended_action}</p>
        </div>

        {event.log_excerpt && (
          <div className="mt-2 pt-2 border-t border-slate-800">
            <span className="text-slate-500 text-[10px] block mb-1">Raw SIP Log Excerpt:</span>
            <pre className="p-2 rounded bg-black/60 border border-slate-800/80 text-[11px] text-sky-300 overflow-x-auto whitespace-pre-wrap">
              {event.log_excerpt}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
