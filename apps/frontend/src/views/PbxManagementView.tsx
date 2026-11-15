import React, { useState } from 'react'
import { StateToggleBar, type PageState, LoadingSkeleton, EmptyState, ErrorState } from '../components/StateToggleBar'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { MOCK_PBX_NODES } from '../mock/pageData'
import { Server, RefreshCw, Plus, Check, Shield, X, CheckCircle2 } from 'lucide-react'

export interface PbxNodeItem {
  id: string
  ip: string
  trunkGroup: number
  sipDomain: string
  signalingPort: number
  rtpRange: string
  status: 'REACHABLE' | 'UNREACHABLE' | 'STANDBY'
  lastSync: string
}

export function PbxManagementView() {
  const [state, setState] = useState<PageState>('populated')
  const [nodes, setNodes] = useState<PbxNodeItem[]>(MOCK_PBX_NODES as PbxNodeItem[])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Form State
  const [nodeId, setNodeId] = useState('OXE-CS-02')
  const [nodeIp, setNodeIp] = useState('172.19.112.52')
  const [trunkGroup, setTrunkGroup] = useState('4')
  const [domain, setDomain] = useState('oxe.enterprise')
  const [port, setPort] = useState('5060')
  const [rtpRange, setRtpRange] = useState('32500-32755')

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      setSuccessToast('PBX node statuses refreshed via SNMP/SIP options ping.')
      setTimeout(() => setSuccessToast(null), 3000)
    }, 600)
  }

  const handleRegisterNode = (e: React.FormEvent) => {
    e.preventDefault()
    const newNode: PbxNodeItem = {
      id: nodeId,
      ip: nodeIp,
      trunkGroup: parseInt(trunkGroup, 10) || 4,
      sipDomain: domain,
      signalingPort: parseInt(port, 10) || 5060,
      rtpRange: rtpRange,
      status: 'REACHABLE',
      lastSync: 'Just now',
    }
    setNodes((prev) => [...prev, newNode])
    setShowAddModal(false)
    setSuccessToast(`PBX Node ${nodeId} registered successfully.`)
    setTimeout(() => setSuccessToast(null), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            PBX Management & Trunk Topologies
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            OmniPCX Enterprise CS/GD/GA CPU nodes, SIP trunks, and subscriber pools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Nodes
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Register PBX Node
          </Button>
        </div>
      </div>

      {successToast && (
        <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      <StateToggleBar state={state} onChange={setState} label="PBX Management State" />

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'error' && <ErrorState error="SNMP polling error: OXE management agent not responding on port 161." onRetry={handleRefresh} />}
      {state === 'empty' && (
        <EmptyState
          message="No PBX nodes registered."
          actionLabel="Add OmniPCX Node"
          onAction={() => setShowAddModal(true)}
        />
      )}

      {state === 'populated' && (
        <Card className="border border-border/60 bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node Identifier</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Trunk Group</TableHead>
                  <TableHead>SIP Domain</TableHead>
                  <TableHead>Signaling Port</TableHead>
                  <TableHead>RTP Port Range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <Server className="w-4 h-4 text-emerald-400" />
                        {node.id}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Last sync: {node.lastSync}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{node.ip}</TableCell>
                    <TableCell className="font-mono text-xs">TG {node.trunkGroup}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{node.sipDomain}</TableCell>
                    <TableCell className="font-mono text-xs">{node.signalingPort}</TableCell>
                    <TableCell className="font-mono text-xs">{node.rtpRange}</TableCell>
                    <TableCell>
                      <Badge variant={node.status === 'REACHABLE' ? 'success' : 'destructive'} className="text-[10px]">
                        {node.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Register Node Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-base font-bold text-foreground">Register OmniPCX PBX Node</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegisterNode} className="space-y-3 text-xs">
              <div>
                <label htmlFor="node-id" className="text-muted-foreground block mb-1">Node Identifier</label>
                <Input id="node-id" value={nodeId} onChange={(e) => setNodeId(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="node-ip" className="text-muted-foreground block mb-1">IP Address / Hostname</label>
                  <Input id="node-ip" value={nodeIp} onChange={(e) => setNodeIp(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="node-port" className="text-muted-foreground block mb-1">SIP Port</label>
                  <Input id="node-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="node-domain" className="text-muted-foreground block mb-1">SIP Domain / Realm</label>
                  <Input id="node-domain" value={domain} onChange={(e) => setDomain(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="node-tg" className="text-muted-foreground block mb-1">Trunk Group</label>
                  <Input id="node-tg" type="number" value={trunkGroup} onChange={(e) => setTrunkGroup(e.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="node-rtp" className="text-muted-foreground block mb-1">RTP Media Port Range</label>
                <Input id="node-rtp" value={rtpRange} onChange={(e) => setRtpRange(e.target.value)} placeholder="32500-32755" />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register Node
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
