import type { Meta, StoryObj } from '@storybook/react'
import { ExecutionStatusCard } from './ExecutionStatusCard'

const meta: Meta<typeof ExecutionStatusCard> = {
  title: 'Components/ExecutionStatusCard',
  component: ExecutionStatusCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ExecutionStatusCard>

export const SimulatedRunning: Story = {
  args: {
    executionId: 'exec-sim-99',
    mode: 'SIMULATED',
    state: 'RUNNING',
    environmentName: 'Local Simulation Lab',
    scenarioName: 'INVITE_Caller_Auth_PRACK',
    callRate: 15.0,
    callCount: 100,
    durationSeconds: 14.2,
  },
}

export const PhysicalCompleted: Story = {
  args: {
    executionId: 'exec-phy-01',
    mode: 'PHYSICAL',
    state: 'COMPLETED',
    environmentName: 'Hardware Lab OXE Primary',
    scenarioName: 'INVITE_Caller_PRACK',
    callRate: 20.0,
    callCount: 500,
    durationSeconds: 25.1,
  },
}
