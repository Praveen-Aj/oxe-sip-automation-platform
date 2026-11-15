# MODULE RESPONSIBILITIES & DIRECTORY OWNERSHIP

**Date**: November 14, 2026  
**Scope**: Codebase organization, directory ownership, and component boundary definitions.

---

## 1. Directory Tree & Ownership Overview

```text
SIPP/
├── apps/
│   ├── backend/             # FastAPI backend application, routers, services, adapters, database
│   ├── frontend/            # React 18, TypeScript, Tailwind, Storybook, Playwright E2E
│   └── runner/              # Execution runner implementations (SimulatedRunner, future LiveSIPpRunner)
├── shared/
│   ├── contracts/           # Abstract Python interfaces (IExecutionRunner, etc.)
│   └── schemas/             # Pydantic schemas (runtime, environment, execution, telemetry)
├── assets/
│   └── sipp/                # Unchanged baseline SIP XML scenarios & CSV templates
├── config/                  # Configuration profiles and YAML definitions
├── database/                # SQLite database (sipp_platform.db)
├── docs/                    # Architecture, design system, compatibility & QA strategy specifications
├── tests/
│   ├── backend/             # Pytest backend tests (runtimes, environments, api, core)
│   └── regression_test.py   # Preserved 29-test SIP protocol regression suite
└── scripts/                 # Bash orchestrators (sipp_manager.sh) and utility scripts
```

---

## 2. Component Boundaries & Responsibilities

### 2.1 `apps/backend/`
- **Ownership**: Python backend developers.
- **Entry Point**: `apps/backend/main.py`.
- **Subdirectories**:
  - `adapters/runtime/`: Platform adapters (`BaseRuntimeAdapter`, `WindowsRuntimeAdapter`, `WindowsWslRuntimeAdapter`, `LinuxRuntimeAdapter`, `RemoteLinuxRuntimeAdapter`, and `RuntimeManager`). Responsible for host discovery, prerequisite validation, path translation, and remote SSH orchestration.
  - `api/v1/`: FastAPI routers and endpoints (`runtimes.py`, `environments.py`, `system.py`). Validates request payloads and maps domain exceptions to HTTP status codes.
  - `core/`: Core database setup (`database.py` with SQLAlchemy models `RuntimeModel` and `EnvironmentModel`), settings (`config.py`), and logging.
  - `services/`: Business logic services (`environment_service.py`). Manages environment configuration lifecycle, PBX parameter validation, and caller/called host associations.
- **Rule**: Never execute raw shell commands directly in endpoints; always delegate to adapters or services.

### 2.2 `apps/frontend/`
- **Ownership**: Frontend & UI/UX developers.
- **Entry Point**: `apps/frontend/src/main.tsx` and `App.tsx`.
- **Subdirectories**:
  - `src/components/`: Reusable UI components (`RuntimeCard`, `EnvironmentCard`, `MetricCard`, `StatusBadge`, `LogViewer`, `Header`, etc.).
  - `src/views/`: Primary page views (`RuntimeManagerView`, `EnvironmentsView`, `LiveExecutionView`, `ScenarioCatalogueView`).
  - `src/api/`: Typed API client modules (`runtimes.ts`, `environments.ts`) communicating with `/api/v1`.
  - `src/test/`: Vitest unit and component tests.
  - `e2e/`: Playwright E2E browser test specs (`app.spec.ts`, accessibility audits).
- **Rule**: Every view and card must explicitly implement Empty, Loading, Error, and Populated states.

### 2.3 `apps/runner/`
- **Ownership**: Test execution engineers.
- **Components**:
  - `simulated_runner.py`: Implements `IExecutionRunner` for development, automated CI testing, and demonstration without physical hardware.
- **Rule**: Must strictly implement `shared/contracts/runner.py`.

### 2.4 `shared/`
- **Ownership**: Cross-cutting / Platform Architects.
- **Subdirectories**:
  - `contracts/`: Abstract interfaces defining system-wide contracts (`runner.py` -> `IExecutionRunner`).
  - `schemas/`: Pydantic models for data interchange:
    - `runtime.py`: `RuntimeType`, `RuntimeStatus`, `RuntimeCreate`, `RuntimeResponse`, `RuntimeValidationResult`.
    - `environment.py`: `PBXConfig`, `HostConfig`, `EnvironmentCreate`, `EnvironmentResponse`.
- **Rule**: No dependencies on FastAPI, SQLAlchemy, or UI frameworks. Must remain pure Python/Pydantic.

### 2.5 `assets/sipp/`
- **Ownership**: Telecom / SIP Protocol Engineers.
- **Contents**:
  - `REGISTER.xml`, `REGISTER_Auth.xml`
  - `INVITE_Caller.xml`, `INVITE_Called.xml`
  - `INVITE_Caller_Auth.xml`, `INVITE_Caller_PRACK.xml`, `INVITE_Called_PRACK.xml`
  - `INVITE_Caller_Auth_PRACK.xml`
  - Baseline CSV injection files.
- **Rule**: **Immutable Baseline**. Never delete, rename, or rewrite existing scenarios.

### 2.6 `tests/`
- **Ownership**: QA & Test Automation Engineers.
- **Contents**:
  - `backend/`: Pytest unit and integration tests covering adapters, endpoints, and services.
  - `regression_test.py`: Preserved protocol regression test suite.
- **Rule**: Every new backend service or adapter must have corresponding unit tests with >=75% coverage.
