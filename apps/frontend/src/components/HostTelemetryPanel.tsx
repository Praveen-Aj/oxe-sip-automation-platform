import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Terminal, Cpu, CheckCircle2, AlertCircle } from 'lucide-react'

export interface HostTelemetryPanelProps {
  role: 'CALLER' | 'CALLED'
  hostname: string
  status: string
  pid?: number
  isAlive: boolean
  sippVersion?: string
  totalEvents?: number
}

export const HostTelemetryPanel: React.FC<HostTelemetryPanelProps> = ({
  role,
  hostname,
  status,
  pid,
  isAlive,
  sippVersion = 'SIPp v3.7.0',
  totalEvents = 0,
}) => {
  return (
    <Card className="bg-slate-900 border-slate-800 text-slate-100 flex-1">
      <CardHeader className="py-2.5 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {role} Host ({role === 'CALLER' ? 'UAC' : 'UAS'})
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className={`font-mono text-[9px] uppercase ${
            isAlive
              ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 text-xs font-mono space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-500">Host IP / Name:</span>
          <span className="text-slate-200">{hostname}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Process PID:</span>
          <span className="text-sky-400">{pid ? `PID ${pid}` : 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Binary Version:</span>
          <span className="text-slate-300">{sippVersion}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Processed Signals:</span>
          <span className="text-slate-200">{totalEvents} calls</span>
        </div>
      </CardContent>
    </Card>
  )
}
