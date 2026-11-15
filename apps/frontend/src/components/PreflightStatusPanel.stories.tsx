import type { Meta, StoryObj } from '@storybook/react'
import { PreflightStatusPanel } from './PreflightStatusPanel'

const meta: Meta<typeof PreflightStatusPanel> = {
  title: 'Components/PreflightStatusPanel',
  component: PreflightStatusPanel,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PreflightStatusPanel>

export const ReadyState: Story = {
  args: {
    isReady: true,
    overallStatus: 'READY',
    totalChecks: 8,
    passedCount: 8,
    warningCount: 0,
    blockerCount: 0,
    onRevalidate: () => {},
    onProceed: () => {},
  },
}

export const BlockedState: Story = {
  args: {
    isReady: false,
    overallStatus: 'BLOCKED',
    totalChecks: 8,
    passedCount: 5,
    warningCount: 1,
    blockerCount: 2,
    onRevalidate: () => {},
  },
}
