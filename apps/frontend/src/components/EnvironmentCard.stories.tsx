import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Check, Trash2 } from 'lucide-react'

const meta: Meta = {
  title: 'Platform/EnvironmentCard',
  tags: ['autodocs'],
}

export default meta

export const ActiveProduction: StoryObj = {
  render: () => (
    <Card className="w-84 border-primary ring-1 ring-primary/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Hardware Lab OXE Primary</CardTitle>
            <span className="text-[10px] text-muted-foreground font-mono">env-lab-oxe-primary</span>
          </div>
          <Badge variant="warning" className="text-[10px] uppercase font-bold">
            WARNING
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="space-y-1.5 p-2 rounded bg-muted/20 border border-border/40 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">OXE PBX:</span>
            <span className="text-emerald-400 font-semibold">172.19.112.51:5060</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Caller:</span>
            <span>172.19.112.50:5060</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Called:</span>
            <span>172.19.112.60:5080</span>
          </div>
        </div>
        <div className="pt-2 flex gap-2">
          <Button size="sm" className="w-full text-xs h-7">
            <Check className="w-3.5 h-3.5 mr-1" /> Active Target
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2">Validate</Button>
        </div>
      </CardContent>
    </Card>
  ),
}

export const DemoSimulation: StoryObj = {
  render: () => (
    <Card className="w-84 border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm font-semibold">Local Windows Simulation</CardTitle>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px] uppercase font-bold">
                DEMO
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">env-local-simulation</span>
          </div>
          <Badge variant="success" className="text-[10px] uppercase font-bold">
            VALID
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="space-y-1.5 p-2 rounded bg-muted/20 border border-border/40 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">OXE PBX:</span>
            <span className="text-emerald-400 font-semibold">127.0.0.1:5060</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transport:</span>
            <span>UDP</span>
          </div>
        </div>
        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="w-full text-xs h-7">Select Target</Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2">Validate</Button>
        </div>
      </CardContent>
    </Card>
  ),
}
