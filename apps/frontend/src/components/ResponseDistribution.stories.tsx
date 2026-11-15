import type { Meta, StoryObj } from '@storybook/react';
import { ResponseDistribution } from './ResponseDistribution';

const meta: Meta<typeof ResponseDistribution> = {
  title: 'Telecom/ResponseDistribution',
  component: ResponseDistribution,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ResponseDistribution>;

export const CombinedAuthAndPRACK: Story = {
  args: {
    distribution: {
      '100 Trying': 100,
      '407 Challenge': 100,
      '183 Session Progress (100rel)': 100,
      'PRACK 200': 100,
      '200 OK (INVITE)': 98,
      'BYE 200': 95,
      'Errors': 2,
    },
  },
};
