import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { ScenarioCard, type ScenarioItem } from '../components/ScenarioCard'
import { ScenarioDetailPanel } from '../components/ScenarioDetailPanel'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { RotateCw, Search, Filter, BookOpen } from 'lucide-react'

export interface ScenarioCatalogueViewProps {
  onSelectScenario?: (scenario: ScenarioItem) => void
  onNavigate?: (pageId: string) => void
}

const FALLBACK_SCENARIOS: ScenarioItem[] = [
  {
    id: 'invite-caller-auth-prack',
    name: 'INVITE Caller - Auth PRACK',
    filename: 'INVITE_Caller_Auth_PRACK.xml',
    role: 'UAC',
    description: 'Outbound call with Digest Auth (401/407) and reliable 100rel PRACK provisional response handling.',
    categories: ['Authentication + PRACK', 'Basic Calling'],
    methods: ['INVITE', 'ACK', 'BYE', 'PRACK'],
    authentication: true,
    prack: true,
    media: true,
    codecs: ['PCMA', 'PCMU'],
    publish: false,
    csv_required: true,
    csv_fields: ['field0', 'field1', 'field2', 'field3', 'field4'],
    validation_status: 'VALID',
    element_count: 58,
  },
  {
    id: 'invite-called-prack',
    name: 'INVITE Called - PRACK UAS',
    filename: 'INVITE_Called_PRACK.xml',
    role: 'UAS',
    description: 'UAS call receiver supporting reliable 180 Ringing with Require: 100rel and awaiting PRACK.',
    categories: ['PRACK'],
    methods: ['INVITE', 'ACK', 'BYE', 'PRACK'],
    authentication: false,
    prack: true,
    media: true,
    codecs: ['PCMU'],
    publish: false,
    csv_required: false,
    validation_status: 'VALID',
    element_count: 24,
  },
  {
    id: 'register',
    name: 'SIP Registration Endpoint',
    filename: 'REGISTER.xml',
    role: 'UAC',
    description: 'SIP Endpoint Registration with Contact and Digest Authentication.',
    categories: ['Registration', 'Authentication'],
    methods: ['REGISTER', '200'],
    authentication: true,
    prack: false,
    media: false,
    codecs: [],
    publish: false,
    csv_required: true,
    csv_fields: ['field0', 'field1'],
    validation_status: 'VALID',
    element_count: 18,
  },
]

export function ScenarioCatalogueView({ onSelectScenario, onNavigate }: ScenarioCatalogueViewProps) {
  const [state, setState] = useState<PageState>('populated')
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(FALLBACK_SCENARIOS)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [selectedScenario, setSelectedScenario] = useState<ScenarioItem | null>(null)
  const [inspectXmlScenario, setInspectXmlScenario] = useState<ScenarioItem | null>(null)
  const [rawXml, setRawXml] = useState<string>('')
  const [isLoadingXml, setIsLoadingXml] = useState(false)

  const fetchScenarios = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/scenarios'))
      if (res.ok) {
        const data = await res.json()
        setScenarios(data)
      } else {
        setScenarios(FALLBACK_SCENARIOS)
      }
    } catch {
      setScenarios(FALLBACK_SCENARIOS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscover = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/v1/scenarios/discover'), { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setScenarios(data)
      } else {
        setScenarios(FALLBACK_SCENARIOS)
      }
    } catch {
      setScenarios(FALLBACK_SCENARIOS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInspectXml = async (scenario: ScenarioItem) => {
    setInspectXmlScenario(scenario)
    setIsLoadingXml(true)
    try {
      const res = await fetch(apiUrl(`/api/v1/scenarios/${scenario.id}/content`))
      if (res.ok) {
        const text = await res.text()
        setRawXml(text)
      } else {
        setRawXml('<!-- Failed to load scenario XML from backend -->')
      }
    } catch {
      setRawXml('<!-- Offline mode: Backend disconnected -->')
    } finally {
      setIsLoadingXml(false)
    }
  }

  const handleConfigure = (scenario: ScenarioItem) => {
    if (onSelectScenario) {
      onSelectScenario(scenario)
    }
    if (onNavigate) {
      onNavigate('config')
    }
  }

  useEffect(() => {
    fetchScenarios()
  }, [])

  const categories = ['ALL', 'Basic Calling', 'Authentication', 'PRACK', 'Authentication + PRACK', 'Registration', 'PUBLISH']

  const filteredScenarios = scenarios.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'ALL' ||
      s.categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase())

    const matchesRole = selectedRole === 'ALL' || s.role === selectedRole

    return matchesSearch && matchesCategory && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            SIP Scenario Catalogue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover, classify, inspect, and parameterize telecom test scenarios from assets/sipp/
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-xs border-slate-700 bg-slate-900 text-slate-300">
            Discovered: <strong className="text-sky-400 ml-1">{scenarios.length} Scenarios</strong>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscover}
            disabled={isLoading}
            className="text-xs border-slate-700 hover:bg-slate-800"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Scan Asset Library
          </Button>
        </div>
      </div>

      <StateToggleBar state={state} onChange={setState} label="Catalogue State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && (
        <ErrorState
          error="Failed to parse XML scenario schemas in assets/sipp/ directory: syntax violation detected."
          onRetry={fetchScenarios}
        />
      )}
      {state === 'empty' && (
        <EmptyState
          message="No SIP scenarios loaded in repository asset library."
          actionLabel="Scan assets/sipp/ Directory"
          onAction={handleDiscover}
        />
      )}

      {state === 'populated' && (
        <>
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Search scenarios by name, filename, or method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1 font-mono">
                <Filter className="w-3 h-3" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.length === 0 ? (
              <div className="col-span-full p-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
                No scenarios match query '{searchQuery}' in category '{selectedCategory}'.
              </div>
            ) : (
              filteredScenarios.map((sc) => (
                <ScenarioCard
                  key={sc.id}
                  scenario={sc}
                  isSelected={selectedScenario?.id === sc.id}
                  onSelect={handleConfigure}
                  onInspectXml={handleInspectXml}
                />
              ))
            )}
          </div>

          {/* Modal Scenario Detail & XML Inspection Panel */}
          {inspectXmlScenario && (
            <ScenarioDetailPanel
              scenario={inspectXmlScenario}
              rawXml={rawXml}
              isLoadingXml={isLoadingXml}
              onClose={() => setInspectXmlScenario(null)}
              onConfigure={handleConfigure}
            />
          )}
        </>
      )}
    </div>
  )
}
