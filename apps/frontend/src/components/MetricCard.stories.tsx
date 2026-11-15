import type { Meta, StoryObj } from '@storybook/react';
import { MetricCard } from './MetricCard';

const meta: Meta<typeof MetricCard> = {
  title: 'Telecom/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger', 'accent'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const CallRate: Story = {
  args: {
    label: 'Call Rate (CPS)',
    value: '10.0',
    subValue: 'Target: 10.0 calls/sec',
    variant: 'accent',
  },
};

export const TotalCalls: Story = {
  args: {
    label: 'Total Calls Completed',
    value: 100,
    subValue: 'Limit: 100 calls',
    variant: 'default',
  },
};

export const FailedCalls: Story = {
  args: {
    label: 'Failed / Rejected Calls',
    value: 0,
    subValue: 'Error Rate: 0.0%',
    variant: 'success',
  },
};

export const CriticalErrors: Story = {
  args: {
    label: 'Failed / Rejected Calls',
    value: 5,
    subValue: 'Error Rate: 5.0% (486 Busy / 503)',
    variant: 'danger',
  },
};
