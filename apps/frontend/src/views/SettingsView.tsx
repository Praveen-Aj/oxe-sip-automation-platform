import React, { useState } from 'react'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Settings, Save, Lock, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react'

export function SettingsView() {
  const [state, setState] = useState<PageState>('populated')
  const [dbPath, setDbPath] = useState('database/app.db')
  const [corsOrigins, setCorsOrigins] = useState('http://localhost:5173,http://127.0.0.1:5173')
  const [runnerTimeout, setRunnerTimeout] = useState('30')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 400)
  }

  const handleRestoreDefaults = () => {
    setDbPath('database/app.db')
    setCorsOrigins('http://localhost:5173,http://127.0.0.1:5173')
    setRunnerTimeout('30')
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            System & Security Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Global orchestrator settings, database persistence, and invariant controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <Badge variant="success" className="text-xs gap-1 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Settings State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Configuration write error: Permission denied on config/settings.yaml."
          onRetry={handleSave}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="Settings empty or default file missing."
          actionLabel="Restore Defaults"
          onAction={handleRestoreDefaults}
        />
      )}

      {state === 'populated' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-sm">Storage & Persistence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label htmlFor="settings-db-path" className="text-muted-foreground block mb-1">
                  SQLite Database Relative Path
                </label>
                <Input
                  id="settings-db-path"
                  value={dbPath}
                  onChange={(e) => setDbPath(e.target.value)}
                  className="font-mono"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Dynamically resolved from project root. No machine-specific absolute paths.
                </span>
              </div>
              <div>
                <label htmlFor="settings-cors" className="text-muted-foreground block mb-1">
                  CORS Allowed Origins
                </label>
                <Input
                  id="settings-cors"
                  value={corsOrigins}
                  onChange={(e) => setCorsOrigins(e.target.value)}
                  className="font-mono text-[11px]"
                />
              </div>
              <div>
                <label htmlFor="settings-timeout" className="text-muted-foreground block mb-1">
                  Runner Process Timeout (seconds)
                </label>
                <Input
                  id="settings-timeout"
                  value={runnerTimeout}
                  onChange={(e) => setRunnerTimeout(e.target.value)}
                  type="number"
                  className="font-mono max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-sm">Security Invariants & Protections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 bg-muted/20 border border-border/40 rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Windows DPAPI Credential Vault</span>
                  <Badge variant="success">ENFORCED</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Credentials like SSH keys and passwords are encrypted using OS-level DPAPI keys bound to the Windows user session.
                </p>
              </div>

              <div className="p-3 bg-muted/20 border border-border/40 rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Password Masking & Log Scrubbing</span>
                  <Badge variant="success">ENFORCED</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Passwords are masked as '********' in all API responses and stripped from logs and reports.
                </p>
              </div>

              <div className="p-3 bg-muted/20 border border-border/40 rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">CSV Permissions (chmod 600)</span>
                  <Badge variant="success">ENFORCED</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Generated subscriber injection files enforce POSIX 0600 permissions.
                </p>
              </div>

              <div className="p-3 bg-muted/20 border border-border/40 rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Physical Lab Dispatch Safety Gate</span>
                  <Badge variant="success">ENFORCED</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Physical SIP signaling to OXE requires explicit operator confirmation check.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
