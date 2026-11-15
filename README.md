# OXE SIP Automation Platform

A modern, web-hosted telecom automation and test orchestration platform for Alcatel-Lucent OmniPCX Enterprise (OXE) SIP networks. Designed to run on a portable Windows host while seamlessly orchestrating distributed SIPp execution engines across remote Linux hosts (such as Rocky Linux) and local environments.

---

## 1. Project Purpose
The **OXE SIP Automation Platform** provides telecom test engineers with an integrated, user-friendly control plane for executing, monitoring, diagnosing, and reporting SIP protocol load and regression tests against Alcatel-Lucent OmniPCX Enterprise (OXE) PBXs. 

Historically, SIP testing required executing complex shell scripts and invoking SIPp commands manually with rigid command-line arguments. This platform elevates those capabilities into an enterprise web application offering dynamic configuration, distributed multi-host orchestration, preflight validation gates, real-time WebSocket telemetry, automated failure diagnostics, and multi-format reporting.

---

## 2. System Architecture

The platform follows a decoupled, modular monorepo architecture:

```
+-------------------------------------------------------------------------+
|                              Windows Host                               |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  |     React 18 Frontend     | <===> |        FastAPI Backend        |  |
|  | (TypeScript, Vite, Shacn) | REST/ |  - Configuration Engine       |  |
|  | - 11 Domain Views         |  WS   |  - Preflight Readiness Gate   |  |
|  | - 24 Storybook Components |       |  - Orchestrator Engine        |  |
|  +---------------------------+       |  - Diagnostics & Synthesis    |  |
|                                      |  - Multi-Platform Credential  |  |
|                                      |    Vault (DPAPI / Portable)   |  |
|                                      +---------------+---------------+  |
|                                                      |                  |
+------------------------------------------------------|------------------+
                                                       | SSH (accept-new)
                                                       v
                       +-----------------------------------------------+
                       |           Remote Linux Host (Rocky 9)         |
                       |                                               |
                       |  +------------------+   +------------------+  |
                       |  |  SIPp UAC Caller |   |  SIPp UAS Called |  |
                       |  |  (e.g., Port 5060) | |  (e.g., Port 5080) |  |
                       |  +--------+---------+   +--------+---------+  |
                       +-----------|----------------------|------------+
                                   |                      |
                            SIP    |                      | SIP
                         Signaling |                      | Signaling
                                   v                      v
                       +-----------------------------------------------+
                       |          Alcatel-Lucent Enterprise            |
                       |                  OXE PBX                      |
                       +-----------------------------------------------+
```

### Core Architectural Contracts
- **Contract-Based Runtime Execution**: All runner targets implement `IExecutionRunner` (`shared/contracts/runner.py`). No shell command is executed without contract abstraction.
- **Single-Host & Distributed Topologies**: Supports co-located execution (CALLER UAC and CALLED UAS on the same host with automated port collision protection) or multi-host topologies across separate machines.
- **Decoupled Configuration & Execution**: Test configurations generate dynamic CSV injection files with `0o600` permissions and monotonic sequence headers without altering static baseline XML scenarios.

---

## 3. Technology Stack

- **Backend**: Python 3.10+ (tested on Python 3.12), FastAPI, Pydantic v2, SQLAlchemy, SQLite (WAL mode), AnyIO, Paramiko.
- **Frontend**: React 18, TypeScript 5.4, Vite 5, Tailwind CSS, shadcn/ui component patterns, Lucide icons, TanStack React Query.
- **Design & UI Quality**: Storybook 10.6, Axe-core accessibility auditing.
- **Testing**:
  - Backend: `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx`.
  - Frontend Unit: `vitest`, `@testing-library/react`, `jsdom`.
  - End-to-End: Playwright (Chromium multi-worker).
  - Code Quality: `ruff` (Python), `oxlint` (Frontend).

---

## 4. Directory Structure

```text
.
├── apps/
│   ├── backend/               # FastAPI application, routers, services, database
│   │   ├── adapters/          # IExecutionRunner adapters (Windows, Linux, Remote SSH)
│   │   ├── core/              # Database sessions, credentials vault, settings
│   │   ├── routers/           # REST endpoints (configurations, executions, etc.)
│   │   └── services/          # Orchestrator, preflight, reporting, diagnostics
│   └── frontend/              # React 18 + TypeScript web application
│       ├── src/
│       │   ├── components/    # Reusable UI components and .stories.tsx
│       │   ├── views/         # 11 domain views (Dashboard, Execution, etc.)
│       │   └── lib/           # Centralized API client (apiUrl, apiFetch)
│       └── e2e/               # Playwright end-to-end test specs
├── shared/                    # Shared Pydantic schemas and runner contracts
├── assets/sipp/               # Byte-for-byte preserved SIP XML scenarios and templates
├── config/                    # Configuration profiles, vault keys, SSH stores
├── database/                  # SQLite schema definitions and migrations
├── docs/                      # Architectural specifications and audit reports
├── legacy/                    # Baseline bash scripts and CLI tools
├── scripts/                   # Simulation runners and utility scripts
├── tests/                     # Multi-tier test suites (unit, integration, regression)
├── AGENTS.md                  # Project invariants and agent governance
├── DEVELOPMENT.md             # Developer environment setup and runbook
└── CONTRIBUTING.md            # Code conventions and contribution guide
```

---

## 5. Windows Setup

### 5.1 Prerequisites
- **Windows 10 / 11** (64-bit)
- **Python 3.10+** (ensure `python` and `pip` are on `PATH`)
- **Node.js 20+** (LTS recommended, includes `npm`)
- **Git for Windows**

### 5.2 Clone and Setup
```cmd
git clone <repository-url>
cd oxe-sip-automation-platform
```

Create and activate the Python virtual environment:
```cmd
python -m venv .venv
.venv\Scripts\activate
pip install -r apps\backend\requirements.txt
```

Install frontend dependencies:
```cmd
cd apps\frontend
npm install
cd ..
```

---

## 6. Backend Startup

To start the FastAPI backend service on port 8000:
```cmd
set PYTHONPATH=.
.venv\Scripts\python.exe -m uvicorn apps.backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- **REST API Documentation (Swagger)**: `http://127.0.0.1:8000/api/v1/docs`
- **System Health Check**: `http://127.0.0.1:8000/api/v1/system/health`

---

## 7. Frontend Startup

In a separate terminal window:
```cmd
cd apps\frontend
npm run dev
```
- **Web Interface**: `http://localhost:5173`

To launch Storybook component explorer:
```cmd
cd apps\frontend
npm run storybook
```
- **Storybook UI**: `http://localhost:6006`

---

## 8. Test Execution

The platform enforces a multi-tier test pyramid:

### 8.1 Backend Tests (Pytest)
```cmd
.venv\Scripts\python.exe -m pytest tests\backend
```

### 8.2 Frontend Component Tests (Vitest)
```cmd
cd apps\frontend
npx vitest run
```

### 8.3 Frontend Production Build
```cmd
cd apps\frontend
npm run build
```

### 8.4 Storybook Static Build
```cmd
cd apps\frontend
npm run build-storybook
```

### 8.5 End-to-End Suite (Playwright)
```cmd
cd apps\frontend
npx playwright test
```

### 8.6 Frontend Linting (Oxlint)
```cmd
cd apps\frontend
npm run lint
```

### 8.7 Baseline Asset Integrity
Verify that baseline SIP scenarios and shell scripts remain 100% byte-for-byte preserved:
```powershell
Get-FileHash assets\sipp\INVITE_Caller_Auth_PRACK.xml, assets\sipp\INVITE_Called.xml, sipp_manager.sh
```

---

## 9. Rocky Linux Runtime Configuration

The platform supports executing SIPp on Rocky Linux 9.x servers:

1. **Host Prerequisites**:
   - Standard Rocky Linux 9.4+ installation.
   - SSH service enabled (`sshd`).
   - Dedicated service user (e.g. `sippuser`) with authorized SSH key or password.
2. **Firewall Requirements**:
   - Inbound SIP UDP/TCP ports (default `5060` for CALLER, `5080` for CALLED).
   - Inbound RTP media port ranges (e.g., `6000-6050`).
3. **SSH Security**:
   - Connections utilize `StrictHostKeyChecking=accept-new` to guard against Man-in-the-Middle (MITM) attacks while storing fingerprints in `config/ssh/known_hosts`.

---

## 10. Environment Configuration

Environments are configured dynamically through the UI or REST API:

- **Local Simulation**: Runs without external hardware; emulates SIP call signaling, Digest auth handshakes, 100rel provisional responses, and error conditions.
- **Single-Host Rocky Lab**: CALLER (UAC) and CALLED (UAS) execute concurrently on the same Rocky Linux host using separate socket ports (`5060` / `5080`). Automated preflight validation prevents port collision.
- **Dual-Host Distributed Lab**: CALLER and CALLED execute on distinct physical or virtual Linux servers.

---

## 11. SIPp Installation

For Rocky Linux hosts where SIPp is not yet installed, the platform provides automated guidance and diagnostics:
```bash
# EPEL Repository and Build Tools
sudo dnf install -y epel-release
sudo dnf config-manager --set-enabled crb
sudo dnf install -y git gcc-c++ cmake make ncurses-devel openssl-devel libpcap-devel

# Build SIPp v3.7.1
git clone https://github.com/SIPp/sipp.git
cd sipp
git checkout v3.7.1
cmake -DUSE_SSL=1 -DUSE_PCAP=1 .
make
sudo make install
```
Verify installation:
```bash
sipp -v
```

---

## 12. Security Considerations

- **Credential Vault**: Implements `ICredentialProvider` supporting Windows DPAPI (`WindowsDPAPIProvider`) for machine-local encryption, and `PortableFileProvider` with `0o600` permissions.
- **Secret Masking**: Passwords and digest tokens are never exposed in logs or API read models (`auth_password_masked: "********"`).
- **SSH Hardening**: Strict host-key validation prevents MITM and ARP spoofing risks.
- **File Permissions**: Dynamic CSV files and injection templates enforce POSIX `0o600` masks.

---

## 13. Current Project Status

- **Status**: Phase 14A Product Stabilization Complete.
- **Verification Summary**:
  - Backend unit and contract tests: 40/40 passed.
  - Frontend component tests: 25/25 passed.
  - Playwright E2E journeys: 12/12 passed.
  - Production & Storybook builds: 100% clean.
  - Baseline SIP assets: Verified 100% hash match.
  - Web accessibility: WCAG 2.2 Level AA compliant.

---

## 14. Known Limitations

- **Physical OXE Lab Testing**: In accordance with project invariants, **no physical SIP signaling was sent to the production/lab PBX hardware** during simulation phases. Physical end-to-end signaling to the lab PBX remains designated:
  **NOT YET VALIDATED ON PHYSICAL HARDWARE** (pending authorized lab window).
- **Windows Native Process SIPp**: Native Windows execution relies on the simulated runner adapter or WSL2 runtime.

---

## 15. Development Roadmap

- **Phase 15**: Live Rocky Linux Lab Execution and physical SIP signaling validation against the test PBX.
- **Phase 16**: Dual-host remote distributed execution with automated network latency and jitter profiling.
- **Phase 17**: Advanced SIP scenario authoring suite with drag-and-drop ladder diagram generator.

---

## License & Invariants
Internal engineering asset. All baseline SIP XML scenarios (`assets/sipp/*.xml`) and legacy bash scripts (`sipp_manager.sh`) are preserved under strict byte-for-byte invariants.
