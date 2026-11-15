# EXECUTION ARCHITECTURE: RUNNER ABSTRACTION & RUNTIME ADAPTERS

**Date**: November 14, 2026  
**Scope**: Architecture specification defining the separation of concerns between Execution Runners and Platform Runtime Adapters in the OXE SIP Automation Platform.

---

## 1. Architectural Principle: Separation of Concerns

The execution architecture enforces a strict decoupling between **how a SIP test scenario runs** (Execution Runner) and **where it runs** (Platform Runtime Adapter).

```mermaid
graph TD
    subgraph ExecutionPlane ["Execution Plane (What & How)"]
        ExecEngine["Execution Engine / Service"]
        IRunner["IExecutionRunner (Abstract Contract)"]
        SimRunner["SimulatedRunner (Mock / Telemetry Generation)"]
        LiveRunner["LiveSIPpRunner (Future Real SIPp Execution)"]
        IRunner --> SimRunner
        IRunner --> LiveRunner
        ExecEngine --> IRunner
    end

    subgraph RuntimePlane ["Runtime & Platform Plane (Where & Capability)"]
        RuntimeMgr["RuntimeManager"]
        BaseAdapter["BaseRuntimeAdapter (Abstract Contract)"]
        WinAdapter["WindowsRuntimeAdapter (Native Win32)"]
        WslAdapter["WindowsWslRuntimeAdapter (WSL2 Bridge)"]
        LinuxAdapter["LinuxRuntimeAdapter (Native POSIX)"]
        RemoteAdapter["RemoteLinuxRuntimeAdapter (OpenSSH)"]
        
        RuntimeMgr --> BaseAdapter
        BaseAdapter --> WinAdapter
        BaseAdapter --> WslAdapter
        BaseAdapter --> LinuxAdapter
        BaseAdapter --> RemoteAdapter
    end

    subgraph TargetHosts ["Physical / Virtual Hosts"]
        Host_Win["Windows Host (Local)"]
        Host_WSL["WSL2 VM (Local)"]
        Host_Linux["Linux Machine (Local)"]
        Host_Caller["CALLER Node (172.19.112.50)"]
        Host_Called["CALLED Node (172.19.112.60)"]
    end

    ExecEngine -.->|"Queries Active Runtime"| RuntimeMgr
    LiveRunner -->|"Prepares & Spawns via"| BaseAdapter
    WinAdapter --> Host_Win
    WslAdapter --> Host_WSL
    LinuxAdapter --> Host_Linux
    RemoteAdapter --> Host_Caller
    RemoteAdapter --> Host_Called
```

---

## 2. Component Responsibilities

### 2.1 Execution Runner (`IExecutionRunner`)
The Execution Runner is responsible for the **test execution lifecycle**:
1. **Scenario Parameterization**: Compiling high-level test configurations (call rate, duration, auth flags, PRACK parameters) into execution arguments.
2. **CSV Injection Generation**: Emitting strictly formatted CSV files adhering to OXE SIP domain standards (`chmod 600`, masked credentials).
3. **Execution Lifecycle**: Initializing, starting, pausing, stepping, and terminating the SIPp execution instances.
4. **Real-time Telemetry Streaming**: Capturing stdout/stderr/screen logs, parsing SIP counter metrics (calls total, calls answered, failed 4xx/5xx/6xx, retransmissions, response times), and publishing metrics via WebSockets.
5. **Result Aggregation**: Producing consolidated test summaries and storing run records in SQLite.

*Invariants*:
- The Runner never assumes it is running on a specific OS.
- The Runner never issues raw system-level socket calls or subprocess calls directly without consulting the Runtime Adapter for path translation and shell wrappers.

### 2.2 Platform Runtime Adapter (`BaseRuntimeAdapter`)
The Platform Runtime Adapter is responsible for **host discovery, capability validation, and process spawning**:
1. **Host Environment Discovery**: Detecting OS kernel, architecture, memory, CPU load, and network interfaces.
2. **Prerequisite & Tool Auditing**: Verifying availability of required binaries (`sipp`, `ssh`, `python3`, `wsl.exe`).
3. **Path Translation**: Converting filesystem paths across operating system boundaries (e.g., Windows `C:\path` to WSL `/mnt/c/path` or remote Linux `/tmp/sipp/...`).
4. **Process Execution & Signal Dispatch**: Spawning processes with safe argument vectors (no raw shell string interpolation) and sending clean POSIX termination signals (`SIGINT`, `SIGTERM`).
5. **Credential & Secret Protection**: Ensuring SSH private keys and passwords are masked in all logs and metadata.

---

## 3. Platform Adapter Hierarchy

All adapters derive from `BaseRuntimeAdapter` (`apps/backend/adapters/runtime/base.py`):

```text
BaseRuntimeAdapter (ABC)
├── WindowsRuntimeAdapter
│   └── Native Windows environment. Reports Windows OS details and verifies local binary paths.
├── WindowsWslRuntimeAdapter
│   └── Detects wsl.exe, queries installed Linux distributions (e.g. Ubuntu), and translates paths via wslpath.
├── LinuxRuntimeAdapter
│   └── Native Linux POSIX execution. Inspects /proc, /etc/os-release, and local sipp binary.
└── RemoteLinuxRuntimeAdapter
    └── Connects over OpenSSH (subprocess ssh/scp) using key or password authentication.
        Enforces strict timeouts, argument arrays, and secret masking.
```

### Key Contract Methods

```python
class BaseRuntimeAdapter(ABC):
    @abstractmethod
    def detect_os(self) -> dict[str, Any]:
        """Query operating system name, release, architecture, and kernel."""
        ...

    @abstractmethod
    def check_sipp_version(self) -> Optional[str]:
        """Detect installed SIPp binary version string."""
        ...

    @abstractmethod
    def check_prerequisites(self) -> dict[str, bool]:
        """Verify presence of all prerequisite tools and libraries."""
        ...

    @abstractmethod
    def validate(self) -> RuntimeValidationResult:
        """Run complete diagnostic check and return ready status with diagnostic logs."""
        ...

    @abstractmethod
    def translate_path(self, local_path: str) -> str:
        """Translate a local workspace path into the runtime's filesystem syntax."""
        ...
```

---

## 4. Execution Sequence Diagram

The following sequence illustrates how the Execution Engine, Runtime Manager, and Target Hosts collaborate to run a test:

```mermaid
sequenceDiagram
    autonumber
    actor User as QA Engineer (Frontend)
    participant API as FastAPI /api/v1
    participant Svc as Execution Service
    participant Env as Environment Service
    participant Runt as Runtime Manager
    participant Adap as RemoteLinuxRuntimeAdapter
    participant Remote as CALLER Host (172.19.112.50)
    participant PBX as Alcatel-Lucent OXE (172.19.112.51)

    User->>API: POST /api/v1/execution/start {environment_id, scenario_id}
    API->>Svc: start_test(env_id, scenario_id)
    Svc->>Env: get_environment(env_id)
    Env-->>Svc: EnvironmentConfig (caller_host: 172.19.112.50, pbx: 172.19.112.51)
    
    Svc->>Runt: get_adapter_for_host("172.19.112.50")
    Runt-->>Svc: RemoteLinuxRuntimeAdapter instance
    
    Svc->>Adap: validate()
    Adap->>Remote: ssh -o ConnectTimeout=5 sipp@172.19.112.50 "sipp -v"
    Remote-->>Adap: SIPp v3.7.7-TLS-PCAP
    Adap-->>Svc: ValidationResult(is_ready=True)

    Svc->>Adap: deploy_scenario_assets(xml_path, csv_path)
    Adap->>Remote: scp scenarios/INVITE_Caller_Auth.xml /tmp/sipp/
    Adap->>Remote: scp inject.csv /tmp/sipp/ (chmod 600)
    
    Svc->>Adap: spawn_sipp_process(args)
    Adap->>Remote: ssh sipp@172.19.112.50 "sipp -sf /tmp/sipp/INVITE_Caller_Auth.xml 172.19.112.51 ..."
    Remote->>PBX: SIP INVITE (UDP 5060)
    
    loop Live Telemetry Streaming
        Remote-->>Adap: Stdout periodic screen stats
        Adap-->>Svc: Parsed Metrics (Calls: 50, Msg/s: 10, Retrans: 0)
        Svc-->>User: WebSocket Stream (/ws/live-metrics)
    end
```

---

## 5. Security & Isolation Invariants

1. **No Plaintext Passwords**: `AUTH_PASSWORD` and SSH credentials must never be written to plaintext logs, returned over REST APIs without masking (`********`), or passed via unsecured command line flags.
2. **File Permissions**: All CSV injection files containing credentials or user data must be deployed with POSIX permissions `chmod 600`.
3. **Safe Subprocess Execution**: Subprocesses are spawned using array/vector arguments (`["ssh", "-p", "22", ...]`) rather than shell interpolation (`shell=False`) to prevent command injection vulnerabilities.
4. **Portability**: All file paths are dynamically resolved from the repository root; hardcoded absolute user directory paths are strictly forbidden.
