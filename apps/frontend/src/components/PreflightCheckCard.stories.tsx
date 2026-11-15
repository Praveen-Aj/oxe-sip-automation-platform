import type { Meta, StoryObj } from '@storybook/react'
import { PreflightCheckCard, type PreflightCheckItem } from './PreflightCheckCard'

const meta: Meta<typeof PreflightCheckCard> = {
  title: 'Components/PreflightCheckCard',
  component: PreflightCheckCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof PreflightCheckCard>

const passItem: PreflightCheckItem = {
  category: 'ENVIRONMENT',
  name: 'PBX Host IP Syntax',
  status: 'PASS',
  is_blocker: false,
  message: 'Valid IPv4 address: 172.19.112.51',
}

const warnItem: PreflightCheckItem = {
  category: 'PORT',
  name: 'UDP Port 5060 Availability',
  status: 'WARNING',
  is_blocker: false,
  message: 'UDP port 5060 appears to be occupied or in use by another process.',
  remediation: 'Verify whether an existing SIPp instance or local SIP client is bound to this port.',
}

const failBlockerItem: PreflightCheckItem = {
  category: 'RUNTIME_CALLER',
  name: 'CALLER Runtime (Lab CALLER Node)',
  status: 'FAIL',
  is_blocker: true,
  message: 'CALLER host reports: SSH connection timed out after 5.0s',
  remediation: 'Ensure host is reachable and OpenSSH daemon is running.',
}

export const PassState: Story = {
  args: {
    check: passItem,
  },
}

export const WarningState: Story = {
  args: {
    check: warnItem,
  },
}

export const BlockerState: Story = {
  args: {
    check: failBlockerItem,
  },
}
