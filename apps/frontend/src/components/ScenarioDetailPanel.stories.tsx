import type { Meta, StoryObj } from '@storybook/react'
import { ScenarioDetailPanel } from './ScenarioDetailPanel'

const meta: Meta<typeof ScenarioDetailPanel> = {
  title: 'Components/ScenarioDetailPanel',
  component: ScenarioDetailPanel,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ScenarioDetailPanel>

export const Default: Story = {
  args: {
    scenario: {
      id: 'invite-caller-auth-prack',
      name: 'INVITE Caller - Authentication + PRACK',
      filename: 'INVITE_Caller_Auth_PRACK.xml',
      role: 'UAC',
      description: 'Outbound call with Digest Auth and 100rel PRACK.',
      categories: ['Authentication + PRACK'],
      methods: ['INVITE', 'ACK', 'BYE', 'PRACK'],
      authentication: true,
      prack: true,
      media: true,
      publish: false,
      csv_required: true,
      validation_status: 'VALID',
      element_count: 58,
    },
    rawXml: `<?xml version="1.0" encoding="ISO-8859-1" ?>
<scenario name="INVITE_Caller_Auth_PRACK">
  <send retrans="500">
    <![CDATA[
      INVITE sip:[field1]@[field2]:[field3] SIP/2.0
      Supported: 100rel
    ]]>
  </send>
</scenario>`,
    isLoadingXml: false,
  },
}
