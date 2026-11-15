# Backend Architecture & Service Boundaries

## 1. Architectural Philosophy
The backend is structured as a modular, decoupled platform running on Python 3 with FastAPI. It isolates operating-system primitives and hardware drivers behind strict contracts.

## 2. Invariant Rules

### 1. Runner Abstraction Layer
- All execution engines must implement `IExecutionRunner` (`shared/contracts/runner.py`).
- Business services must NEVER invoke SIPp binaries or shell scripts directly.
- The initial prototype uses `SimulatedRunner` (`apps/runner/simulated.py`) to safely model protocol flows.

### 2. Platform Abstraction Layer (PAL)
- Operating-system differences (Windows vs. Linux vs. WSL vs. Remote SSH) must be handled by `PlatformAdapter` implementations in `apps/backend/adapters/runtime/`.
- Never write inline `if os.name == 'nt'` scattered through business logic.

### 3. Data Schemas & Validation
- All input requests and responses must adhere strictly to Pydantic models in `shared/schemas/`.
- Passwords must be protected using `SecretStr` or masked to prevent leakage into logs or Swagger outputs.

### 4. Filesystem & Portability
- Never use machine-specific absolute paths (`C:\Users\...` or `/home/...`).
- Use `pathlib.Path` or dynamically derived repository roots.
- All generated CSV files must enforce `chmod 600` permissions.
