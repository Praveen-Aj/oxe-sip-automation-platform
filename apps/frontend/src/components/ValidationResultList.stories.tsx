import type { Meta, StoryObj } from '@storybook/react'
import { ValidationResultList } from './ValidationResultList'
import { type PreflightCheckItem } from './PreflightCheckCard'

const meta: Meta<typeof ValidationResultList> = {
  title: 'Components/ValidationResultList',
  component: ValidationResultList,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ValidationResultList>

const mockChecks: PreflightCheckItem[] = [
  {
    category: 'ENVIRONMENT',
    name: 'PBX Host IP Syntax',
    status: 'PASS',
    is_blocker: false,
    message: 'Valid IPv4 address: 172.19.112.51',
  },
  {
    category: 'SCENARIO',
    name: 'Scenario XML Schema',
    status: 'PASS',
    is_blocker: false,
    message: 'Valid SIPp scenario XML (58 elements)',
  },
  {
    category: 'PORT',
    name: 'UDP Port 5060 Availability',
    status: 'WARNING',
    is_blocker: false,
    message: 'UDP port 5060 in use by existing process',
    remediation: 'Stop conflicting SIP process or select alternate port.',
  },
  {
    category: 'RUNTIME_CALLER',
    name: 'CALLER Runtime',
    status: 'FAIL',
    is_blocker: true,
    message: 'SIPp binary not found on target host',
    remediation: 'Install SIPp v3.7.x via apt install sipp.',
  },
]

export const Default: Story = {
  args: {
    checks: mockChecks,
  },
}
