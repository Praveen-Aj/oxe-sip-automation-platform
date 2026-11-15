# OXE SIP Automation Platform — Development & Operations Guide

## 1. Modular Monorepo Structure

```text
SIPP/
├── apps/
│   ├── backend/             # FastAPI REST & WebSocket service
│   │   ├── adapters/runtime/ # Windows, WSL2, Linux, and Remote SSH adapters
│   │   ├── api/v1/          # Endpoints for runtimes, environments, system
│   │   ├── core/            # Database (SQLite), models, configuration
│   │   └── services/        # Business logic (EnvironmentManager, etc.)
│   ├── frontend/            # React 18 + Vite + TypeScript web application
│   │   ├── src/components/  # Storybook-tested components (RuntimeCard, EnvironmentCard)
│   │   └── src/views/       # RuntimeManagerView, EnvironmentsView, etc.
│   └── runner/              # Pluggable execution runners (Simulated & future Live)
├── shared/
│   ├── contracts/           # Abstract Python interfaces (IExecutionRunner)
│   └── schemas/             # Pydantic data schemas (runtime, environment, telemetry)
├── assets/
│   └── sipp/                # Preserved XML scenarios & CSV templates
├── config/                  # Legacy and profile configuration files
├── database/                # SQLite persistent storage (sipp_platform.db)
├── docs/                    # Architecture, design & audit specifications
├── tests/
│   ├── backend/             # Pytest test suite (adapters, environments, endpoints)
│   └── regression_test.py   # Preserved 29-test SIP protocol regression suite
├── scripts/                 # Bash orchestrator, remote deployment scripts
└── legacy/                  # Historical reference assets and traces
```

---

## 2. Startup Commands

### Start Backend (FastAPI on Port 8000)
```cmd
set PYTHONPATH=.
.venv\Scripts\python.exe -m uvicorn apps.backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Swagger UI / OpenAPI docs: `http://127.0.0.1:8000/api/v1/docs`
- Health check: `http://127.0.0.1:8000/api/v1/system/health`
- Runtimes API: `http://127.0.0.1:8000/api/v1/runtimes`
- Environments API: `http://127.0.0.1:8000/api/v1/environments`

### Start Frontend (Vite on Port 5173)
```cmd
cd apps\frontend
npm run dev
```
- Web Application UI: `http://localhost:5173`

### Start Storybook (Port 6006)
```cmd
cd apps\frontend
npm run storybook
```
- Storybook Component Catalog: `http://localhost:6006`
- Static Storybook build: `npm run build-storybook` (outputs to `apps/frontend/storybook-static`)

---

## 3. Operational Workflows

### 3.1 Runtime Discovery & Host Provisioning
1. **Trigger Local Discovery**:
   Send `POST /api/v1/runtimes/discover`. The backend discovers the local host (Native Windows, WSL2, or Linux Native) and persists it.
2. **Register Remote Linux Host (e.g. CALLER 172.19.112.50)**:
   Send `POST /api/v1/runtimes` with payload:
   ```json
   {
     "name": "Lab CALLER (172.19.112.50)",
     "type": "REMOTE_LINUX",
     "host": "172.19.112.50",
     "port": 22,
     "username": "sipp"
   }
   ```
3. **Validate Runtime Diagnostics**:
   Send `POST /api/v1/runtimes/{runtime_id}/validate`. The runtime adapter executes non-blocking capability audits and reports OS information and SIPp binary status.

### 3.2 Environment Management
1. **Create Environment**:
   Send `POST /api/v1/environments` defining PBX target (`172.19.112.51`), Trunk Group (`4`), and Host associations.
2. **Validate Readiness**:
   Send `POST /api/v1/environments/{environment_id}/validate`. The environment manager verifies PBX parameters and tests connectivity across linked runtimes.

---

## 4. Test Execution Commands

### Backend Pytest Suite
```cmd
set PYTHONPATH=. && .venv\Scripts\python.exe -m pytest tests\backend -v --cov=apps/backend
```

### Backend Linter (Ruff)
```cmd
.venv\Scripts\ruff.exe check apps tests/backend
```

### Frontend Vitest Suite
```cmd
cd apps\frontend && npx vitest run
```

### Frontend Storybook Build
```cmd
cd apps\frontend && npm run build-storybook
```

### Frontend Production Build
```cmd
cd apps\frontend && npm run build
```

### Frontend Playwright E2E Suite
```cmd
cd apps\frontend && npx playwright test
```
