# Preflight Validation Engine Architecture

## 1. Overview
The Preflight Validation Engine acts as an automated safety and readiness gate prior to any SIPp scenario execution. It systematically prevents runtime failures by verifying environments, runtimes, scenario assets, dialplan CSVs, network ports, and target PBX connectivity.

---

## 2. Validation Hierarchy & Categories

| Category | Checks Executed | Blocker vs Warning | Remediation Guidance |
|---|---|---|---|
| **ENVIRONMENT** | Environment ID lookup, PBX IP syntax (RFC 791), Trunk Group assignment | Blocker if missing environment or invalid IP; Warning if demo | Configure valid environment profile with IPv4 address |
| **SCENARIO** | Asset existence in `assets/sipp/`, XML schema validity, method tags | Blocker if file missing or invalid XML; Warning if custom | Place valid XML scenario in `assets/sipp/` |
| **RUNTIME_CALLER** | Caller runtime availability, SIPp binary installed | Blocker if unavailable (in live mode); Warning in demo | Install SIPp binary or configure SSH connectivity |
| **RUNTIME_CALLED** | Called runtime availability (for dual-host UAS scenarios) | Blocker if unavailable; Skipped for standalone UAC/REG | Ensure answering node runtime is online |
| **PORT** | Local UDP/TCP port binding availability (5060, 5080) | Blocker if port occupied by another process | Terminate conflicting process or change port in configuration |
| **PBX_CONNECTIVITY** | IPv4 syntax check, non-intrusive TCP socket ping to PBX port (e.g. 5060) | Blocker if unreachable in live mode; Warning/Skipped in demo | Verify physical LAN connection, routing, and OXE SIP trunk |
| **CSV** | Subscriber CSV existence, semicolon delimiter, non-empty rows | Blocker if CSV required and missing; Warning if permissions open | Generate dynamic CSV in Configuration Engine |

---

## 3. Readiness Evaluation Logic
1. **Overall Status**:
   - `READY`: All checks passed, or only non-blocking warnings present.
   - `WARNING`: All critical checks passed, but warnings exist (e.g. simulated demo mode).
   - `BLOCKED`: At least one check flagged with `is_blocker=True` failed (`status="FAIL"`).
2. **Execution Gate**:
   - The UI and execution runner refuse to initiate test execution unless `is_ready == True`.

---

## 4. REST Endpoints
- `POST /api/v1/preflight/validate`: Run validation for an environment, scenario, and optional configuration.
  - Body:
    ```json
    {
      "environment_id": "env-local-simulation",
      "scenario_id": "invite-caller-auth-prack",
      "configuration_id": "cfg-xyz",
      "target_ports": [5060, 5080]
    }
    ```
  - Response:
    ```json
    {
      "environment_id": "env-local-simulation",
      "scenario_id": "invite-caller-auth-prack",
      "overall_status": "READY",
      "is_ready": true,
      "checks": [ ... ],
      "blockers": [],
      "warnings": [ ... ]
    }
    ```
