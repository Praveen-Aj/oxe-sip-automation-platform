from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DiagnosticSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class DiagnosticCategory(str, Enum):
    AUTHENTICATION_FAILURE = "AUTHENTICATION_FAILURE"
    PRACK_FAILURE = "PRACK_FAILURE"
    TIMEOUT = "TIMEOUT"
    RETRANSMISSION = "RETRANSMISSION"
    SIP_4XX_RESPONSE = "SIP_4XX_RESPONSE"
    SIP_5XX_RESPONSE = "SIP_5XX_RESPONSE"
    SIP_6XX_RESPONSE = "SIP_6XX_RESPONSE"
    PROCESS_CRASH = "PROCESS_CRASH"
    NETWORK_DISCONNECT = "NETWORK_DISCONNECT"
    CSV_PARSE_ERROR = "CSV_PARSE_ERROR"
    UNKNOWN = "UNKNOWN"


class DiagnosticEvent(BaseModel):
    id: str
    execution_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: DiagnosticSeverity
    category: DiagnosticCategory
    sip_code: Optional[int] = None
    affected_host: str = "CALLER"  # CALLER | CALLED | PBX
    observed_fact: str
    suspected_cause: str
    recommended_action: str
    log_excerpt: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class ExecutionDiagnosticsReport(BaseModel):
    execution_id: str
    total_events: int = 0
    critical_count: int = 0
    error_count: int = 0
    warning_count: int = 0
    events: List[DiagnosticEvent] = Field(default_factory=list)
    root_cause_summary: Optional[str] = None
