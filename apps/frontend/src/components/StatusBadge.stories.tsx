import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Telecom/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Ready: Story = {
  args: {
    status: 'READY',
    label: 'READY FOR TEST',
  },
};

export const Running: Story = {
  args: {
    status: 'RUNNING',
    label: 'EXECUTION IN PROGRESS',
  },
};

export const Completed: Story = {
  args: {
    status: 'COMPLETED',
    label: 'RUN COMPLETED',
  },
};

export const Failed: Story = {
  args: {
    status: 'FAILED',
    label: 'EXECUTION FAILED',
  },
};
