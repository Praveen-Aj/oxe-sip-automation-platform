# ARCHITECTURAL & TECHNICAL DECISIONS RECORD (ADR)

**Date**: November 14, 2026  
**Architect**: Senior Software Architect  
**Project**: OXE SIP Automation Web Platform

---

## ADR-01: Windows SIPp Execution Strategy (WSL2 as Primary vs. Native Win32)

- **Context**: The existing SIP automation toolkit relies heavily on modern SIPp features (v3.7.x) including complex regex evaluation (`Require: (^|[ ,])100rel([ ,]|$)`), variable comparisons (`<strcmp>`), dynamic CSeq mirroring, and OpenSSL digest authentication. Windows native SIPp releases are largely outdated community ports (v3.3–v3.5) or lack PCAP and TLS support.
- **Alternatives Considered**:
  1. *Cygwin*: Requires distributing large Cygwin DLL runtimes and POSIX path translation overhead.
  2. *Win32 Native Port*: High maintenance, missing POSIX signals (`SIGUSR1` for statistics), potential variable parsing bugs.
  3. *WSL2 Engine (Selected)*: Modern Windows 10/11 includes WSL2 by default. In our local test environment, `wsl -d Ubuntu -- sipp -v` executes **SIPp v3.7.7-TLS-SCTP-PCAP-SHA256** and passes 100% of our regression tests.
- **Decision**: Design the Windows runtime adapter to use **WSL2 as the primary, default execution engine**, while maintaining an extensible interface for custom native Win32 binaries if configured by an advanced user.
- **Impact**: Guarantees identical execution semantics and 100% scenario compatibility between Windows and Linux without rewriting any XML files.

---

## ADR-02: Backend Framework Selection (FastAPI vs. Flask vs. Django)

- **Context**: The backend needs to serve REST endpoints, manage asynchronous long-running background processes (SIPp runs lasting minutes to hours), stream real-time telemetry over WebSockets, and run cross-platform on Windows and Linux.
- **Alternatives Considered**:
  1. *Django*: Excessively heavy; monolithic ORM is unnecessary for local test automation.
  2. *Flask*: Synchronous by default; requires external add-ons for WebSockets and lacks native async process monitoring.
  3. *FastAPI (Selected)*: Native `asyncio` architecture, built-in WebSocket support, automatic OpenAPI documentation, high performance, and standard Pydantic schema validation.
- **Decision**: Use **Python 3 with FastAPI and Uvicorn**.
- **Impact**: Provides clean asynchronous process handling, zero overhead, and minimal dependency footprint.

---

## ADR-03: Scenario & XML Engine Preservation Strategy

- **Context**: The toolkit contains 9 carefully hardened SIPp scenarios (e.g. `INVITE_Caller_Auth_PRACK.xml`, `INVITE_Called_PRACK.xml`, `REGISTER_Auth.xml`) with verified OXE-specific routing and header manipulation.
- **Alternatives Considered**:
  1. *Rewrite in Python SIP library (e.g., PySIP)*: Would require re-implementing call state machines, re-verifying OXE compatibility, and losing years of proven test hardening.
  2. *Preserve XML Scenarios As Internal Engine (Selected)*: Keep all XML scenarios 100% intact. The web application wraps them, providing clean UI parameterization and dynamic CSV generation.
- **Decision**: **Keep all XML scenario files completely unmodified.**
- **Impact**: Zero regression risk for validated SIP protocol flows and OXE compatibility.

---

## ADR-04: Process Management & Lifecycle Control

- **Context**: In the current CLI, `sipp_manager.sh` uses `-bg` (SIPp's internal daemonizing flag) and writes PIDs to `.sipp.pids`. This relies on Bash process tables and fails to provide reliable process tree cleanup on Windows.
- **Alternatives Considered**:
  1. *Retain `-bg` and parse text PIDs*: Brittle across OS boundaries; PID reuse can kill unrelated processes.
  2. *Foreground Execution in Isolated Process Groups (Selected)*: Launch SIPp in the foreground inside a dedicated background Python worker thread / process group using `subprocess.Popen`.
- **Decision**: On Linux, use `start_new_session=True` and `os.killpg()`. On Windows WSL, issue signals via `wsl.exe`. On Windows native, use `CREATE_NEW_PROCESS_GROUP` and `taskkill.exe /T /F`.
- **Impact**: Deterministic lifecycle control, instant termination, and elimination of orphaned zombie socket processes.

---

## ADR-05: Real-Time Telemetry & Log Transport (WebSocket vs. Server-Sent Events vs. Polling)

- **Context**: The frontend needs live updates of call rates, elapsed time, response distributions, and protocol log streams.
- **Alternatives Considered**:
  1. *HTTP Polling*: Excessive overhead; high latency; repeatedly reading log files from disk causes heavy I/O.
  2. *Server-Sent Events (SSE)*: Unidirectional only; requires a separate channel for client control commands.
  3. *WebSocket (Selected)*: Bidirectional, low-overhead, native streaming for both telemetry metrics and client control (pause/stop).
- **Decision**: Implement a **WebSocket telemetry hub** at `/ws/executions/{id}`. The backend buffers log output and pushes aggregated metrics at 10 Hz (100ms intervals).
- **Impact**: Fluid UI responsiveness with near-zero network and CPU overhead.

---

## ADR-06: Storage & Persistence Engine (SQLite vs. JSON Files vs. PostgreSQL)

- **Context**: The application must persist environment profiles, test execution history, and summary statistics across restarts.
- **Alternatives Considered**:
  1. *PostgreSQL / MySQL*: Requires external server installation and administrative setup, violating portability.
  2. *Flat JSON Files*: Lacks query capabilities, transactional integrity, and concurrent write safety.
  3. *SQLite (Selected)*: Serverless, zero-configuration, cross-platform, embedded in Python standard library (`sqlite3`), file-based, and highly reliable.
- **Decision**: Use **SQLite** (via SQLAlchemy / SQLModel) stored in the application's configurable data directory.
- **Impact**: Portable, zero-dependency storage that runs identically on Windows and Linux.
