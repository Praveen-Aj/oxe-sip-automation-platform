import React from 'react'

export type PageState = 'populated' | 'empty' | 'loading' | 'error'

interface StateToggleBarProps {
  state: PageState
  onChange: (state: PageState) => void
  label?: string
}

export function StateToggleBar({ state, onChange, label }: StateToggleBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 bg-card/40 px-4 py-2 text-xs mb-4 rounded-md">
      <div className="text-muted-foreground font-mono">
        {label || 'View Mode'}: <span className="text-foreground font-semibold uppercase">{state}</span>
      </div>
      <div className="flex gap-1">
        {(['populated', 'empty', 'loading', 'error'] as PageState[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
              state === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-8 bg-muted rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-muted rounded"></div>
        <div className="h-28 bg-muted rounded"></div>
        <div className="h-28 bg-muted rounded"></div>
      </div>
      <div className="h-48 bg-muted rounded"></div>
    </div>
  )
}

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-card/20">
      <p className="text-muted-foreground text-sm mb-3">{message}</p>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="p-6 border border-destructive/40 bg-destructive/10 rounded-lg text-center">
      <h4 className="text-destructive font-semibold mb-1">Failed to Load Data</h4>
      <p className="text-muted-foreground text-xs mb-4">{error}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          Retry Request
        </button>
      )}
    </div>
  )
}
