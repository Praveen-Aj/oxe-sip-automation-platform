from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SipTransport(str, Enum):
    UDP = "UDP"
    TCP = "TCP"
    TLS = "TLS"


class EnvironmentType(str, Enum):
    LAB = "LAB"
    DEVELOPMENT = "DEVELOPMENT"
    SIMULATION = "SIMULATION"


class EnvironmentValidationStatus(str, Enum):
    VALID = "VALID"
    VALIDATED = "VALIDATED"
    WARNING = "WARNING"
    INVALID = "INVALID"
    UNVALIDATED = "UNVALIDATED"


class EnvironmentCreateRequest(BaseModel):
    name: str = Field(..., description="Unique environment name")
    environment_type: EnvironmentType = Field(EnvironmentType.LAB, description="Environment type: LAB, DEV, SIMULATION")
    lab_designation: Optional[str] = Field("OXE-LAB-ROCKY-01", description="Physical or lab pod identifier")
    description: Optional[str] = Field(None, description="Detailed profile description")
    pbx_host: str = Field("127.0.0.1", description="OXE PBX IP address or hostname")
    pbx_port: int = Field(5060, ge=1, le=65535, description="OXE SIP signaling port")
    pbx_domain: str = Field("oxe.enterprise", description="SIP domain or realm")
    trunk_group: int = Field(4, ge=1, description="OXE Trunk Group number")
    caller_runtime_id: Optional[str] = Field(None, description="Associated CALLER runtime ID")
    caller_host: str = Field("127.0.0.1", description="Caller IP address or hostname")
    caller_port: int = Field(5062, ge=1, le=65535, description="Caller SIP port (must not collide with Called)")
    caller_interface: Optional[str] = Field("eth0", description="Caller network interface")
    called_runtime_id: Optional[str] = Field(None, description="Associated CALLED runtime ID")
    called_host: str = Field("127.0.0.1", description="Called IP address (can match Caller on single host)")
    called_port: int = Field(5080, ge=1, le=65535, description="Called SIP port (must not collide with Caller)")
    called_interface: Optional[str] = Field("eth0", description="Called network interface")
    sip_transport: SipTransport = Field(SipTransport.UDP, description="SIP transport layer protocol")
    network_interface: Optional[str] = Field("eth0", description="Binding interface")
    is_demo: bool = Field(False, description="Flag indicating demonstration profile vs operational config")


class EnvironmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    environment_type: Optional[EnvironmentType] = None
    lab_designation: Optional[str] = None
    description: Optional[str] = None
    pbx_host: Optional[str] = None
    pbx_port: Optional[int] = None
    pbx_domain: Optional[str] = None
    trunk_group: Optional[int] = None
    caller_runtime_id: Optional[str] = None
    caller_host: Optional[str] = None
    caller_port: Optional[int] = None
    caller_interface: Optional[str] = None
    called_runtime_id: Optional[str] = None
    called_host: Optional[str] = None
    called_port: Optional[int] = None
    called_interface: Optional[str] = None
    sip_transport: Optional[SipTransport] = None
    network_interface: Optional[str] = None
    is_demo: Optional[bool] = None


class EnvironmentResponse(BaseModel):
    id: str
    name: str
    environment_type: EnvironmentType = EnvironmentType.LAB
    lab_designation: Optional[str] = None
    description: Optional[str] = None
    pbx_host: str
    pbx_port: int
    pbx_domain: str
    trunk_group: int
    caller_runtime_id: Optional[str] = None
    caller_host: str
    caller_port: int
    caller_interface: Optional[str] = None
    called_runtime_id: Optional[str] = None
    called_host: str
    called_port: int
    called_interface: Optional[str] = None
    sip_transport: SipTransport
    network_interface: Optional[str] = None
    is_demo: bool = False
    is_active: bool = False
    status: EnvironmentValidationStatus = EnvironmentValidationStatus.UNVALIDATED
    validation_details: Dict[str, Any] = Field(default_factory=dict)
    port_conflict: bool = False
    port_conflict_message: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class EnvironmentProfileExport(BaseModel):
    environment_name: str
    environment_type: EnvironmentType = EnvironmentType.LAB
    lab_designation: Optional[str] = None
    description: Optional[str] = None
    pbx: Dict[str, Any]
    caller: Dict[str, Any]
    called: Dict[str, Any]
    transport: SipTransport
    export_version: str = "2.0"
    exported_at: Optional[str] = None
    # NOTE: Strictly no secrets or passwords included in exported profile schema!


class EnvironmentValidationResult(BaseModel):
    environment_id: str
    overall_status: EnvironmentValidationStatus
    caller_ready: bool
    called_ready: bool
    pbx_reachable: bool
    checks: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
