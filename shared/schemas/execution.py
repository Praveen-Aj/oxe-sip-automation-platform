from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExecutionState(str, Enum):
    CREATED = "CREATED"
    VALIDATING = "VALIDATING"
    PREPARING = "PREPARING"
    STARTING_CALLED = "STARTING_CALLED"
    CALLED_READY = "CALLED_READY"
    STARTING_CALLER = "STARTING_CALLER"
    RUNNING = "RUNNING"
    STOPPING = "STOPPING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMED_OUT = "TIMED_OUT"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    RECOVERY_REQUIRED = "RECOVERY_REQUIRED"


class ExecutionMode(str, Enum):
    SIMULATED = "SIMULATED"
    PHYSICAL = "PHYSICAL"


class ExecutionHostRole(str, Enum):
    CALLER = "CALLER"
    CALLED = "CALLED"
    STANDALONE = "STANDALONE"


class HostProcessStatus(BaseModel):
    role: ExecutionHostRole
    runtime_id: Optional[str] = None
    hostname: str = "127.0.0.1"
    pid: Optional[int] = None
    is_alive: bool = False
    status: str = "IDLE"  # "IDLE" | "STARTING" | "READY" | "RUNNING" | "STOPPED" | "FAILED"
    command_executed: Optional[str] = None
    error_message: Optional[str] = None
    last_heartbeat: Optional[datetime] = None


class SIPMetricsSnapshot(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    elapsed_seconds: float = 0.0
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    current_cps: float = 0.0
    active_calls: int = 0
    retransmissions: int = 0
    timeouts: int = 0
    response_distribution: Dict[str, int] = Field(default_factory=dict)
    response_times_ms: Dict[str, float] = Field(default_factory=dict)  # min, max, avg


class ExecutionCreateRequest(BaseModel):
    configuration_id: Optional[str] = None
    environment_id: str
    scenario_id: str
    mode: ExecutionMode = ExecutionMode.SIMULATED
    caller_runtime_id: Optional[str] = None
    called_runtime_id: Optional[str] = None
    call_rate: float = Field(default=10.0, gt=0, le=500.0)
    call_count: int = Field(default=100, gt=0, le=100000)
    duration_seconds: Optional[int] = Field(default=None, ge=1, le=86400)
    auth_enabled: bool = False
    auth_password: Optional[str] = None
    prack_enabled: bool = False
    confirm_physical_execution: bool = False  # Mandatory confirmation gate for physical


class ExecutionResponse(BaseModel):
    id: str
    mode: ExecutionMode
    state: ExecutionState
    environment_id: str
    scenario_id: str
    configuration_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    caller_host: HostProcessStatus
    called_host: HostProcessStatus
    metrics: SIPMetricsSnapshot
    failure_reason: Optional[str] = None
    log_file_caller: Optional[str] = None
    log_file_called: Optional[str] = None
    report_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExecutionStopRequest(BaseModel):
    reason: Optional[str] = "User requested stop"
    force: bool = False
