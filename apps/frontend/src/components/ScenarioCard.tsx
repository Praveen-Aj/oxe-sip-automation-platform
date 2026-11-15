import React from 'react'
import { FileCode, ArrowRight, Eye, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ScenarioCapabilityBadge } from './ScenarioCapabilityBadge'

export interface ScenarioItem {
  id: string
  name: string
  filename: string
  role: 'UAC' | 'UAS' | 'REG' | 'MIXED'
  description: string
  categories: string[]
  methods: string[]
  authentication: boolean
  prack: boolean
  media: boolean
  codecs?: string[]
  publish: boolean
  csv_required: boolean
  csv_fields?: string[]
  validation_status: 'VALID' | 'WARNING' | 'INVALID'
  element_count?: number
}

export interface ScenarioCardProps {
  scenario: ScenarioItem
  isSelected?: boolean
  onSelect?: (scenario: ScenarioItem) => void
  onInspectXml?: (scenario: ScenarioItem) => void
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  isSelected = false,
  onSelect,
  onInspectXml,
}) => {
  return (
    <Card
      className={`transition-all bg-slate-900 border text-slate-100 ${
        isSelected
          ? 'border-sky-500 shadow-sm shadow-sky-500/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
          <CardTitle className="text-xs font-semibold text-slate-100 truncate max-w-[220px]">
            {scenario.name}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <ScenarioCapabilityBadge type={scenario.role as any} />
          {scenario.validation_status === 'VALID' && (
            <span className="text-[10px] text-emerald-400 flex items-center font-mono">
              <CheckCircle2 className="w-3 h-3 mr-0.5" /> XML Valid
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-[11px] text-slate-400 line-clamp-2 h-8 leading-4">
          {scenario.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {scenario.authentication && <ScenarioCapabilityBadge type="AUTH" />}
          {scenario.prack && <ScenarioCapabilityBadge type="PRACK" />}
          {scenario.media && <ScenarioCapabilityBadge type="MEDIA" />}
          {scenario.publish && <ScenarioCapabilityBadge type="PUBLISH" />}
          {scenario.csv_required && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-950 border border-slate-800 text-slate-400">
              CSV Injected
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="truncate max-w-[180px]">{scenario.filename}</span>
          <span>{scenario.methods.join(', ')}</span>
        </div>

        <div className="pt-1 flex gap-2">
          {onInspectXml && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInspectXml(scenario)}
              className="flex-1 h-7 text-[11px] border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Eye className="w-3 h-3 mr-1" /> Inspect XML
            </Button>
          )}
          {onSelect && (
            <Button
              variant={isSelected ? 'secondary' : 'default'}
              size="sm"
              onClick={() => onSelect(scenario)}
              className={`flex-1 h-7 text-[11px] ${
                isSelected ? 'bg-sky-950 border border-sky-600 text-sky-200' : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {isSelected ? 'Selected' : 'Configure'} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
