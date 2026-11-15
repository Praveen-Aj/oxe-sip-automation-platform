import type { Meta, StoryObj } from '@storybook/react'
import { ScenarioCard, type ScenarioItem } from './ScenarioCard'

const meta: Meta<typeof ScenarioCard> = {
  title: 'Components/ScenarioCard',
  component: ScenarioCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ScenarioCard>

const mockUacAuthPrack: ScenarioItem = {
  id: 'invite-caller-auth-prack',
  name: 'INVITE Caller - Authentication + PRACK',
  filename: 'INVITE_Caller_Auth_PRACK.xml',
  role: 'UAC',
  description: 'Outbound call with Digest Auth (401/407) and reliable 100rel PRACK provisional response handling.',
  categories: ['Authentication + PRACK', 'Basic Calling'],
  methods: ['INVITE', 'ACK', 'BYE', 'PRACK'],
  authentication: true,
  prack: true,
  media: true,
  codecs: ['PCMA', 'PCMU'],
  publish: false,
  csv_required: true,
  csv_fields: ['field0', 'field1', 'field2', 'field3', 'field4'],
  validation_status: 'VALID',
  element_count: 58,
}

const mockUas: ScenarioItem = {
  id: 'invite-called-prack',
  name: 'INVITE Called - PRACK UAS',
  filename: 'INVITE_Called_PRACK.xml',
  role: 'UAS',
  description: 'UAS call receiver supporting reliable 180 Ringing with Require: 100rel and awaiting PRACK.',
  categories: ['PRACK'],
  methods: ['INVITE', 'ACK', 'BYE', 'PRACK'],
  authentication: false,
  prack: true,
  media: true,
  codecs: ['PCMU'],
  publish: false,
  csv_required: false,
  validation_status: 'VALID',
  element_count: 24,
}

export const UacAuthPrack: Story = {
  args: {
    scenario: mockUacAuthPrack,
    isSelected: false,
  },
}

export const SelectedState: Story = {
  args: {
    scenario: mockUacAuthPrack,
    isSelected: true,
  },
}

export const UasScenario: Story = {
  args: {
    scenario: mockUas,
    isSelected: false,
  },
}
