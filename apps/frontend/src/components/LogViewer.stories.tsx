import type { Meta, StoryObj } from '@storybook/react';
import { LogViewer } from './LogViewer';

const meta: Meta<typeof LogViewer> = {
  title: 'Telecom/LogViewer',
  component: LogViewer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LogViewer>;

export const ActiveProtocolStream: Story = {
  args: {
    maxHeight: '300px',
    autoScroll: true,
    logs: [
      '[SIMULATED] Execution ID: sim-8f2a1b9c',
      '[OUT] INVITE sip:55011@172.19.112.51:5060 CSeq: 1 INVITE (branch=z9hG4bK-1)',
      '[IN ] SIP/2.0 100 Trying',
      '[IN ] SIP/2.0 407 Proxy Authentication Required (nonce="d9a1f2b3")',
      '[OUT] ACK sip:55011@172.19.112.51:5060 CSeq: 1 ACK (top Via branch preserved)',
      '[OUT] INVITE sip:55011@172.19.112.51:5060 CSeq: 2 INVITE (with Proxy-Authorization)',
      '[IN ] SIP/2.0 183 Session Progress (Require: 100rel, RSeq: 101)',
      '[OUT] PRACK sip:55011@172.19.112.51:5060 CSeq: 3 PRACK (RAck: 101 2 INVITE)',
      '[IN ] SIP/2.0 200 OK (to PRACK)',
      '[IN ] SIP/2.0 200 OK (to INVITE CSeq 2)',
      '[OUT] ACK sip:55011@172.19.112.51:5060 CSeq: 2 ACK',
      '[OUT] BYE sip:55011@172.19.112.51:5060 CSeq: 4 BYE',
      '[IN ] SIP/2.0 200 OK (to BYE)'
    ],
  },
};
