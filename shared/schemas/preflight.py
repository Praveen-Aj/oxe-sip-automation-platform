from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PreflightCheckCategory(str, Enum):
    ENVIRONMENT = "ENVIRONMENT"
    SCENARIO = "SCENARIO"
    RUNTIME_CALLER = "RUNTIME_CALLER"
    RUNTIME_CALLED = "RUNTIME_CALLED"
    PORT = "PORT"
    PBX_CONNECTIVITY = "PBX_CONNECTIVITY"
    CSV = "CSV"


class PreflightCheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    SKIPPED = "SKIPPED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class PreflightCheck(BaseModel):
    category: PreflightCheckCategory
    name: str
    status: PreflightCheckStatus
    is_blocker: bool = False
    message: str
    remediation: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class PreflightRequest(BaseModel):
    environment_id: str
    scenario_id: str
    configuration_id: Optional[str] = None
    target_ports: Optional[List[int]] = None


class PreflightResult(BaseModel):
    environment_id: str
    scenario_id: str
    configuration_id: Optional[str] = None
    overall_status: str  # "READY" | "BLOCKED" | "WARNING"
    is_ready: bool
    checks: List[PreflightCheck] = Field(default_factory=list)
    blockers: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    validated_at: datetime = Field(default_factory=datetime.utcnow)
