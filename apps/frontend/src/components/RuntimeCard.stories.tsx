import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Cpu, Terminal, Sliders, Search } from 'lucide-react'

const meta: Meta = {
  title: 'Platform/RuntimeCard',
  tags: ['autodocs'],
}

export default meta

export const WindowsLocal: StoryObj = {
  render: () => (
    <Card className="w-80 border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Local Windows Host
            </CardTitle>
            <span className="text-[10px] text-muted-foreground font-mono">win-native-local</span>
          </div>
          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
            UNAVAILABLE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="space-y-1.5 p-2 bg-muted/20 rounded border border-border/40 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span>NATIVE_WINDOWS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SIPp:</span>
            <span className="text-rose-400">Unavailable</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="w-full text-xs h-7">Validate</Button>
          <Button size="sm" variant="outline" className="text-xs h-7 px-2"><Search className="w-3.5 h-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  ),
}

export const RemoteLinuxReady: StoryObj = {
  render: () => (
    <Card className="w-80 border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Remote CALLER Node
            </CardTitle>
            <span className="text-[10px] text-muted-foreground font-mono">rt-caller-01</span>
          </div>
          <Badge variant="success" className="text-[10px] uppercase font-bold">
            READY
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="space-y-1.5 p-2 bg-muted/20 rounded border border-border/40 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Host:</span>
            <span>172.19.112.50:22</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SIPp:</span>
            <span className="text-emerald-400 font-bold">v3.6.1-Debian</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="w-full text-xs h-7">Validate</Button>
          <Button size="sm" variant="outline" className="text-xs h-7 px-2"><Search className="w-3.5 h-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  ),
}
