import React, { useState } from 'react'
import { type PreflightCheckItem, PreflightCheckCard } from './PreflightCheckCard'

export interface ValidationResultListProps {
  checks: PreflightCheckItem[]
}

export const ValidationResultList: React.FC<ValidationResultListProps> = ({ checks }) => {
  const [filter, setFilter] = useState<'ALL' | 'BLOCKERS' | 'WARNINGS' | 'PASSED'>('ALL')

  const filteredChecks = checks.filter((c) => {
    if (filter === 'BLOCKERS') return c.is_blocker || c.status === 'FAIL'
    if (filter === 'WARNINGS') return c.status === 'WARNING'
    if (filter === 'PASSED') return c.status === 'PASS'
    return true
  })

  return (
    <div className="space-y-4">
      {/* Category / Status Filter Pills */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-semibold text-slate-300">
          Validation Checks ({filteredChecks.length})
        </span>
        <div className="flex gap-1">
          {(['ALL', 'BLOCKERS', 'WARNINGS', 'PASSED'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                filter === mode
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
            No checks match the selected filter '{filter}'.
          </div>
        ) : (
          filteredChecks.map((check, idx) => (
            <PreflightCheckCard key={`${check.category}-${check.name}-${idx}`} check={check} />
          ))
        )}
      </div>
    </div>
  )
}
