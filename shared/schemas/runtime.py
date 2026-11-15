from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RuntimeType(str, Enum):
    NATIVE_WINDOWS = "NATIVE_WINDOWS"
    WINDOWS_WSL2 = "WINDOWS_WSL2"
    NATIVE_LINUX = "NATIVE_LINUX"
    REMOTE_LINUX = "REMOTE_LINUX"
    SIMULATED = "SIMULATED"


class RuntimeRole(str, Enum):
    CALLER = "CALLER"
    CALLED = "CALLED"
    CALLER_CALLED = "CALLER_CALLED"
    STANDALONE = "STANDALONE"
    ORCHESTRATOR = "ORCHESTRATOR"


class RuntimeValidationStatus(str, Enum):
    READY = "READY"
    WARNING = "WARNING"
    UNAVAILABLE = "UNAVAILABLE"
    ERROR = "ERROR"


class SshAuthConfig(BaseModel):
    auth_method: str = Field("KEY", description="'KEY' or 'PASSWORD'")
    key_path: Optional[str] = Field(None, description="Path to private SSH key")
    password: Optional[str] = Field(None, description="Password (masked on retrieval)")


class RuntimeCreateRequest(BaseModel):
    name: str = Field(..., description="Human-readable identifier")
    runtime_type: RuntimeType = Field(..., description="Execution environment type")
    role: RuntimeRole = Field(RuntimeRole.STANDALONE, description="Caller, Called, or Standalone")
    hostname: str = Field("127.0.0.1", description="Hostname or IP address")
    port: int = Field(22, description="SSH port or control port")
    username: Optional[str] = Field(None, description="SSH login principal")
    ssh_auth: Optional[SshAuthConfig] = Field(None, description="SSH authentication configuration")
    wsl_distribution: Optional[str] = Field(None, description="Target WSL distribution name")
    custom_sipp_path: Optional[str] = Field(None, description="Override path to SIPp executable")


class RuntimeUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[RuntimeRole] = None
    hostname: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    ssh_auth: Optional[SshAuthConfig] = None
    wsl_distribution: Optional[str] = None
    custom_sipp_path: Optional[str] = None


class RuntimeDiagnostics(BaseModel):
    os_info: Dict[str, Any] = Field(default_factory=dict)
    distro_info: Dict[str, Any] = Field(default_factory=dict)
    hardware_info: Dict[str, Any] = Field(default_factory=dict)
    python_info: Dict[str, Any] = Field(default_factory=dict)
    sipp_info: Dict[str, Any] = Field(default_factory=dict)
    sipp_capabilities: Dict[str, Any] = Field(default_factory=dict)
    package_manager: Dict[str, Any] = Field(default_factory=dict)
    network_interfaces: List[Dict[str, Any]] = Field(default_factory=list)
    directory_access: Dict[str, Any] = Field(default_factory=dict)
    process_capabilities: Dict[str, Any] = Field(default_factory=dict)
    connection_tests: Dict[str, Any] = Field(default_factory=dict)
    missing_prerequisites: List[str] = Field(default_factory=list)
    setup_instructions: List[str] = Field(default_factory=list)


class SippInstallPlanResponse(BaseModel):
    runtime_id: str
    hostname: str
    os_name: str
    distro_version: Optional[str] = None
    package_manager: str
    recommended_method: str = "PACKAGE"  # PACKAGE or SOURCE_BUILD
    package_commands: List[str] = Field(default_factory=list)
    source_build_commands: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    requires_root: bool = True
    expected_binary_path: str = "/usr/bin/sipp"
    notes: List[str] = Field(default_factory=list)


class RuntimeResponse(BaseModel):
    id: str
    name: str
    runtime_type: RuntimeType
    role: RuntimeRole
    hostname: str
    port: int
    username: Optional[str] = None
    wsl_distribution: Optional[str] = None
    status: RuntimeValidationStatus
    sipp_available: bool
    sipp_version: Optional[str] = None
    operating_system: str
    diagnostics: RuntimeDiagnostics
    last_validated: Optional[str] = None
    message: str = "Runtime registered"


class RuntimeValidationResult(BaseModel):
    runtime_id: str
    status: RuntimeValidationStatus
    sipp_available: bool
    sipp_version: Optional[str] = None
    can_execute: bool
    details: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    diagnostics: RuntimeDiagnostics
