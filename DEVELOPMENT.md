# DEVELOPMENT.md — Local Development & Operations Guide

## 1. Prerequisites
- **Python**: 3.10+ (Installed locally: 3.12.10)
- **Node.js**: 20+ (Installed locally: 24.14.1, npm 11.11.0)
- **Operating System**: Windows 10/11 or modern Linux

---

## 2. Environment Setup

### Backend Virtual Environment
```cmd
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r apps\backend\requirements.txt
```

### Frontend Dependencies
```cmd
cd apps\frontend
npm install
```

---

## 3. Running Services

### Start FastAPI Backend (Port 8000)
```cmd
set PYTHONPATH=.
.venv\Scripts\python.exe -m uvicorn apps.backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Swagger UI / OpenAPI docs: `http://127.0.0.1:8000/api/v1/docs`
- Health check: `http://127.0.0.1:8000/api/v1/system/health`

### Start Vite Frontend (Port 5173)
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
- Compile static Storybook bundle: `npm run build-storybook`

---

## 4. API Endpoints & Workflows

### 4.1 Runtime Manager
- **Discover Local Runtimes**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/v1/runtimes/discover
  ```
  Scans the host and registers Windows Native, WSL2 (if present), or Linux Native runtimes.
- **List Runtimes**:
  ```bash
  curl http://127.0.0.1:8000/api/v1/runtimes
  ```
- **Add Remote SSH Host**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/v1/runtimes \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Lab Caller Node",
      "type": "REMOTE_LINUX",
      "host": "172.19.112.50",
      "port": 22,
      "username": "sipp"
    }'
  ```
- **Validate Runtime**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/v1/runtimes/{runtime_id}/validate
  ```

### 4.2 Environment Manager
- **List Environments**:
  ```bash
  curl http://127.0.0.1:8000/api/v1/environments
  ```
- **Create Environment**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/v1/environments \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Staging OXE Lab",
      "description": "Pre-production lab testing environment",
      "pbx": {
        "ip": "172.19.112.51",
        "port": 5060,
        "trunk_group": "4",
        "domain": "oxe.lab.alcatel-lucent.com"
      },
      "caller_host": {
        "ip": "172.19.112.50",
        "port": 5060,
        "runtime_id": "runtime_id_here"
      },
      "is_demo": false
    }'
  ```
- **Validate Environment Readiness**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/v1/environments/{environment_id}/validate
  ```

---

## 5. Running Verification Tests

```cmd
:: Backend Pytest (with coverage)
set PYTHONPATH=. && .venv\Scripts\python.exe -m pytest tests\backend -v --cov=apps/backend

:: Backend Linter
.venv\Scripts\ruff.exe check apps tests/backend

:: Frontend Vitest Unit Tests
cd apps\frontend && npx vitest run

:: Frontend Production Build
cd apps\frontend && npm run build

:: Storybook Production Build
cd apps\frontend && npm run build-storybook

:: Playwright E2E Tests (with Axe Accessibility)
cd apps\frontend && npx playwright test
```
