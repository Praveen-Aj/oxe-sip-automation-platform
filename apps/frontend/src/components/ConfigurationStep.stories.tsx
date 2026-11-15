import type { Meta, StoryObj } from '@storybook/react'
import { ConfigurationStep } from './ConfigurationStep'

const meta: Meta<typeof ConfigurationStep> = {
  title: 'Components/ConfigurationStep',
  component: ConfigurationStep,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ConfigurationStep>

const mockSteps = [
  { id: 1, title: 'Environment', subtitle: 'Target OXE & nodes' },
  { id: 2, title: 'Scenario', subtitle: 'Select SIP scenario' },
  { id: 3, title: 'Traffic & SIP', subtitle: 'Rates & authentication' },
  { id: 4, title: 'Review', subtitle: 'Review & validation' },
]

export const StepOne: Story = {
  args: {
    steps: mockSteps,
    currentStep: 1,
  },
}

export const StepTwo: Story = {
  args: {
    steps: mockSteps,
    currentStep: 2,
  },
}

export const FinalStep: Story = {
  args: {
    steps: mockSteps,
    currentStep: 4,
  },
}
