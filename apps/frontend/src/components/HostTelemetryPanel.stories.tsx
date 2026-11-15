import type { Meta, StoryObj } from '@storybook/react'
import { HostTelemetryPanel } from './HostTelemetryPanel'

const meta: Meta<typeof HostTelemetryPanel> = {
  title: 'Components/HostTelemetryPanel',
  component: HostTelemetryPanel,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof HostTelemetryPanel>

export const CallerActive: Story = {
  args: {
    role: 'CALLER',
    hostname: '172.19.112.50',
    status: 'RUNNING',
    pid: 14201,
    isAlive: true,
    sippVersion: 'SIPp v3.7.0-Linux',
    totalEvents: 150,
  },
}

export const CalledReady: Story = {
  args: {
    role: 'CALLED',
    hostname: '172.19.112.60',
    status: 'READY',
    pid: 14200,
    isAlive: true,
    sippVersion: 'SIPp v3.7.0-Linux',
    totalEvents: 150,
  },
}
