import type { Meta, StoryObj } from '@storybook/react'
import { ScenarioCapabilityBadge } from './ScenarioCapabilityBadge'

const meta: Meta<typeof ScenarioCapabilityBadge> = {
  title: 'Components/ScenarioCapabilityBadge',
  component: ScenarioCapabilityBadge,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ScenarioCapabilityBadge>

export const UacRole: Story = {
  args: {
    type: 'UAC',
  },
}

export const UasRole: Story = {
  args: {
    type: 'UAS',
  },
}

export const Authentication: Story = {
  args: {
    type: 'AUTH',
  },
}

export const Prack: Story = {
  args: {
    type: 'PRACK',
  },
}

export const Media: Story = {
  args: {
    type: 'MEDIA',
  },
}

export const ValidStatus: Story = {
  args: {
    type: 'VALID',
  },
}
