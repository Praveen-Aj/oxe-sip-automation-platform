import type { Meta, StoryObj } from '@storybook/react'
import { ConfigurationSummary } from './ConfigurationSummary'

const meta: Meta<typeof ConfigurationSummary> = {
  title: 'Components/ConfigurationSummary',
  component: ConfigurationSummary,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ConfigurationSummary>

export const Default: Story = {
  args: {
    scenarioName: 'INVITE Caller - Authentication + PRACK',
    environmentName: 'OXE Lab Staging (Trunk Group 4)',
    callerRange: '55001-55010',
    calledRange: '55011-55020',
    callRate: 15.0,
    callCount: 200,
    transport: 'UDP / 5060',
    authEnabled: true,
    prackEnabled: true,
    estimatedDuration: '14 seconds',
  },
}
