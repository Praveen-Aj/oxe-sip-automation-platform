# SIP Execution Engine & Distributed Orchestration Architecture

## 1. Overview
The SIP Execution Engine and Distributed Orchestrator coordinate telecom signaling workloads across heterogeneous host runtimes (Windows native, Windows WSL2, remote Linux hosts over SSH, or in-memory deterministic simulation).

---

## 2. Distributed Orchestration Flow

```text
              Windows Web Application (FastAPI)
                              |
               Execution Orchestrator Service
                              |
                     Preflight Safety Gate
                              |
               Distributed Process Management
                  /                       \
                 /                         \
        CALLED Linux (UAS)          CALLER Linux (UAC)
        [Starts 1st: -sf UAS]       [Starts 2nd: -sf UAC]
                 \                         /
                  \                       /
                     Alcatel-Lucent OmniPCX
                     Enterprise (OXE) PBX
```

### 2.1 Startup Sequencing
1. **Pre-flight & Workspace Isolation**: The engine creates a dedicated execution directory (`runtime_executions/exec-<id>`). It validates the selected environment, scenario XML, and dialplan CSV.
2. **CALLED (UAS) Startup**: The UAS answering side is initiated first. The orchestrator captures its process ID (`called_pid`), monitors its initial socket binding, and verifies readiness.
3. **CALLER (UAC) Startup**: Once CALLED is marked `READY`, the UAC caller side is launched with configured CPS rates, total call counts, transport flags, and dynamic CSV injection files.

---

## 3. Physical Safety Confirmation Gate
To protect enterprise production PBXs, physical execution strictly enforces `confirm_physical_execution=True`. Any attempt to launch physical traffic without this flag fails with HTTP 400 Bad Request.

---

## 4. Lifecycle State Machine
```text
CREATED -> PREPARING -> STARTING_CALLED -> CALLED_READY -> STARTING_CALLER -> RUNNING -> COMPLETED
                                                                              |
                                                                              +-> STOPPING -> CANCELLED / FAILED
```
All state transitions are persisted in SQLite (`executions` table) with timestamps and process status.

---

## 5. Live Telemetry & Diagnostics
- **WebSocket Endpoint**: `/ws/executions/{execution_id}/metrics` streams periodic telemetry snapshots, CPS rates, dialog counts, and response distribution codes.
- **Automated Diagnostics**: Analyzes 4xx/5xx/6xx responses and UDP retransmissions to diagnose root causes (e.g. Trunk Group 4 DSP channel exhaustion, Digest Auth password mismatches).
- **Formal Reporting**: Generates interactive HTML audit reports, CSV metric streams, and raw JSON document models.
