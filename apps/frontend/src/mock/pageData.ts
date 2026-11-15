// Mock data for all 13 major platform pages

export interface MockEnvironment {
  id: string
  name: string
  callerHost: string
  calledHost: string
  oxeHost: string
  status: 'healthy' | 'degraded' | 'offline'
  sshUser: string
  activeExecution?: string
}

export interface MockScenario {
  id: string
  name: string
  type: 'UAC' | 'UAS' | 'REG'
  file: string
  authSupported: boolean
  prackSupported: boolean
  description: string
  tags: string[]
}

export interface MockHistoryItem {
  id: string
  timestamp: string
  scenario: string
  status: 'PASSED' | 'FAILED' | 'ABORTED'
  cps: number
  totalCalls: number
  failedCalls: number
  duration: string
  environment: string
}

export interface MockPbxNode {
  id: string
  ip: string
  trunkGroup: number
  sipDomain: string
  signalingPort: number
  rtpRange: string
  status: 'REACHABLE' | 'BUSY' | 'UNREACHABLE'
  lastSync: string
}

export const MOCK_ENVIRONMENTS: MockEnvironment[] = [
  {
    id: 'lab-oxe-1',
    name: 'Hardware Lab OXE Primary',
    callerHost: '172.19.112.50',
    calledHost: '172.19.112.60',
    oxeHost: '172.19.112.51',
    status: 'healthy',
    sshUser: 'sipadmin',
  },
  {
    id: 'local-simulated',
    name: 'Windows Native Simulation',
    callerHost: '127.0.0.1:5060',
    calledHost: '127.0.0.1:5080',
    oxeHost: '127.0.0.1:5070',
    status: 'healthy',
    sshUser: 'local',
  },
  {
    id: 'wsl-sandbox',
    name: 'WSL2 Linux Development',
    callerHost: '172.28.16.10',
    calledHost: '172.28.16.20',
    oxeHost: '172.19.112.51',
    status: 'offline',
    sshUser: 'developer',
  },
]

export const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'INVITE_Caller_Auth_PRACK',
    name: 'INVITE Caller (Auth + PRACK)',
    type: 'UAC',
    file: 'INVITE_Caller_Auth_PRACK.xml',
    authSupported: true,
    prackSupported: true,
    description: 'Handles 407/401 challenges and 100rel provisional responses with PRACK negotiation.',
    tags: ['OXE-Production', 'RFC3261', 'RFC3262', 'RFC2617'],
  },
  {
    id: 'INVITE_Caller_PRACK',
    name: 'INVITE Caller (PRACK / 100rel)',
    type: 'UAC',
    file: 'INVITE_Caller_PRACK.xml',
    authSupported: false,
    prackSupported: true,
    description: 'Autonomous PRACK negotiation for reliable 180/183 provisional responses.',
    tags: ['RFC3262', '100rel'],
  },
  {
    id: 'INVITE_Called_PRACK',
    name: 'INVITE Called (PRACK / 100rel UAS)',
    type: 'UAS',
    file: 'INVITE_Called_PRACK.xml',
    authSupported: false,
    prackSupported: true,
    description: 'Terminates calls with reliable 183 session progress and verifies received PRACK.',
    tags: ['UAS', 'RFC3262'],
  },
  {
    id: 'REGISTER_Auth',
    name: 'SIP Registration (Authenticated)',
    type: 'REG',
    file: 'REGISTER_Auth.xml',
    authSupported: true,
    prackSupported: false,
    description: 'Registers subscriber extensions with Digest MD5 authentication.',
    tags: ['Registration', 'RFC2617'],
  },
  {
    id: 'INVITE_Caller',
    name: 'INVITE Caller Baseline',
    type: 'UAC',
    file: 'INVITE_Caller.xml',
    authSupported: false,
    prackSupported: false,
    description: 'Standard baseline UAC scenario for legacy OXE testing.',
    tags: ['Baseline'],
  },
]

export const MOCK_HISTORY: MockHistoryItem[] = [
  {
    id: 'RUN-2026-1114-01',
    timestamp: '2026-11-14 21:45:10',
    scenario: 'INVITE_Caller_Auth_PRACK',
    status: 'PASSED',
    cps: 10,
    totalCalls: 200,
    failedCalls: 0,
    duration: '20s',
    environment: 'Local Simulation',
  },
  {
    id: 'RUN-2026-1114-02',
    timestamp: '2026-11-14 20:12:05',
    scenario: 'INVITE_Caller_PRACK',
    status: 'PASSED',
    cps: 25,
    totalCalls: 500,
    failedCalls: 2,
    duration: '20s',
    environment: 'Hardware Lab OXE Primary',
  },
  {
    id: 'RUN-2026-1114-03',
    timestamp: '2026-11-14 18:30:22',
    scenario: 'REGISTER_Auth',
    status: 'PASSED',
    cps: 5,
    totalCalls: 100,
    failedCalls: 0,
    duration: '20s',
    environment: 'Hardware Lab OXE Primary',
  },
  {
    id: 'RUN-2026-1114-04',
    timestamp: '2026-11-14 16:05:44',
    scenario: 'INVITE_Caller_Auth',
    status: 'FAILED',
    cps: 50,
    totalCalls: 350,
    failedCalls: 120,
    duration: '7s',
    environment: 'WSL2 Linux Development',
  },
]

export const MOCK_PBX_NODES: MockPbxNode[] = [
  {
    id: 'OXE-MAIN-CORE',
    ip: '172.19.112.51',
    trunkGroup: 4,
    sipDomain: 'oxe.alcatel-lucent.enterprise',
    signalingPort: 5060,
    rtpRange: '30000-32000',
    status: 'REACHABLE',
    lastSync: '2 mins ago',
  },
  {
    id: 'OXE-BACKUP-NODE',
    ip: '172.19.112.52',
    trunkGroup: 5,
    sipDomain: 'oxe-backup.enterprise',
    signalingPort: 5060,
    rtpRange: '32001-34000',
    status: 'UNREACHABLE',
    lastSync: '1 day ago',
  },
]
