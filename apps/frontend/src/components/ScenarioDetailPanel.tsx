import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ScenarioCapabilityBadge } from './ScenarioCapabilityBadge'
import { type ScenarioItem } from './ScenarioCard'
import { X, Code2, Check, Copy } from 'lucide-react'

export interface ScenarioDetailPanelProps {
  scenario: ScenarioItem | null
  rawXml?: string
  isLoadingXml?: boolean
  onClose: () => void
  onConfigure?: (scenario: ScenarioItem) => void
}

export const ScenarioDetailPanel: React.FC<ScenarioDetailPanelProps> = ({
  scenario,
  rawXml,
  isLoadingXml = false,
  onClose,
  onConfigure,
}) => {
  const [copied, setCopied] = useState(false)

  if (!scenario) return null

  const handleCopy = () => {
    if (rawXml) {
      navigator.clipboard.writeText(rawXml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl bg-slate-900 border-slate-700 text-slate-100 max-h-[85vh] flex flex-col shadow-2xl">
        <CardHeader className="py-3 px-5 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <CardTitle className="text-sm font-semibold">{scenario.name}</CardTitle>
            <ScenarioCapabilityBadge type={scenario.role as any} />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-400 font-sans">{scenario.description}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-800/60">
              <div>
                <span className="text-slate-500">File:</span> {scenario.filename}
              </div>
              <div>
                <span className="text-slate-500">Elements:</span> {scenario.element_count || '~'}
              </div>
              <div>
                <span className="text-slate-500">Auth:</span> {scenario.authentication ? 'Yes (401/407)' : 'No'}
              </div>
              <div>
                <span className="text-slate-500">PRACK:</span> {scenario.prack ? 'Yes (100rel)' : 'No'}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-sans font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>XML Scenario Inspection (ISO-8859-1)</span>
              {rawXml && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-mono"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy XML'}
                </button>
              )}
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800 max-h-72 overflow-y-auto text-[11px] text-slate-300 leading-relaxed font-mono whitespace-pre">
              {isLoadingXml ? 'Loading scenario XML...' : rawXml || '<!-- XML content unavailable -->'}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose} className="border-slate-700 text-xs">
              Close
            </Button>
            {onConfigure && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onClose()
                  onConfigure(scenario)
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs"
              >
                Proceed to Configuration
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
