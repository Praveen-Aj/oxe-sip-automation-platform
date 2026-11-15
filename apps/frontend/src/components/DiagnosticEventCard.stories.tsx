import type { Meta, StoryObj } from '@storybook/react'
import { DiagnosticEventCard, type DiagnosticEventItem } from './DiagnosticEventCard'

const meta: Meta<typeof DiagnosticEventCard> = {
  title: 'Components/DiagnosticEventCard',
  component: DiagnosticEventCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DiagnosticEventCard>

const sampleError: DiagnosticEventItem = {
  id: 'diag-err-01',
  severity: 'ERROR',
  category: 'SIP_5XX_RESPONSE',
  sip_code: 503,
  affected_host: 'PBX',
  observed_fact: "Received 2 '503 Service Unavailable' response(s) from OXE PBX.",
  suspected_cause: 'OXE SIP trunk group DSP channel exhaustion or trunk out of service.',
  recommended_action: "Check 'spit' trace on OXE CPU, verify trunk group TG-4 status in mgr.",
  log_excerpt: 'SIP/2.0 503 Service Unavailable\nCSeq: 1 INVITE\nServer: Alcatel-Lucent OmniPCX Enterprise',
}

export const ErrorSeverity: Story = {
  args: {
    event: sampleError,
  },
}
