from enum import Enum

from pydantic import BaseModel, Field


class RunnerStatusEnum(str, Enum):
    READY = "READY"
    BUSY = "BUSY"
    ERROR = "ERROR"
    OFFLINE = "OFFLINE"

class ExecutionStateEnum(str, Enum):
    IDLE = "IDLE"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    STOPPING = "STOPPING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ABORTED = "ABORTED"

class RunnerTypeEnum(str, Enum):
    SIMULATED = "SIMULATED"
    LOCAL_WINDOWS = "LOCAL_WINDOWS"
    LOCAL_WSL = "LOCAL_WSL"
    REMOTE_CALLER = "REMOTE_CALLER"
    REMOTE_CALLED = "REMOTE_CALLED"

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    mode: str = "DEVELOPMENT"
    active_runner: str = "SIMULATED"

class RunnerCapabilities(BaseModel):
    runner_id: str
    runner_name: str
    runner_type: RunnerTypeEnum
    is_simulated: bool
    supported_protocols: list[str] = ["UDP", "TCP"]
    supported_scenarios: list[str]
    max_call_rate: int
    tls_support: bool = False
    pcap_support: bool = False

class RunnerStatus(BaseModel):
    runner_id: str
    status: RunnerStatusEnum
    execution_state: ExecutionStateEnum
    current_execution_id: str | None = None
    active_calls: int = 0
    total_calls: int = 0
    failed_calls: int = 0
    current_cps: float = 0.0
    uptime_seconds: float = 0.0
    message: str = "Simulated runner operating normally"

class StartExecutionRequest(BaseModel):
    scenario_id: str = Field(..., description="Target scenario identifier")
    environment_id: str = Field("default", description="Environment profile ID")
    call_rate: int = Field(10, ge=1, le=1000, description="Calls per second")
    call_limit: int = Field(100, ge=1, le=100000, description="Total calls to execute")
    transport: str = Field("UDP", description="Transport protocol (UDP or TCP)")
    auth_enabled: bool = False
    prack_enabled: bool = False

class ExecutionStatusResponse(BaseModel):
    execution_id: str
    scenario_id: str
    state: ExecutionStateEnum
    is_simulated: bool = True
    elapsed_seconds: float
    total_calls: int
    successful_calls: int
    failed_calls: int
    current_cps: float
    response_distribution: dict[str, int]
    recent_logs: list[str]

class ConfigResponse(BaseModel):
    app_name: str = "OXE SIP Automation Toolkit"
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    environment: str = "LOCAL_WINDOWS"
    active_runner_type: RunnerTypeEnum = RunnerTypeEnum.SIMULATED
    available_runners: list[str]
