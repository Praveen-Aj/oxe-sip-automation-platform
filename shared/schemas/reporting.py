from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from shared.schemas.execution import ExecutionMode, ExecutionState, SIPMetricsSnapshot
from shared.schemas.diagnostics import DiagnosticEvent


class ReportFormat(str, Enum):
    JSON = "JSON"
    HTML = "HTML"
    CSV = "CSV"


class ExecutionReport(BaseModel):
    id: str
    execution_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    mode: ExecutionMode
    final_state: ExecutionState
    environment_name: str
    scenario_name: str
    pbx_target: str
    caller_runtime: str
    called_runtime: str
    duration_seconds: float
    metrics: SIPMetricsSnapshot
    diagnostics_summary: Dict[str, Any] = Field(default_factory=dict)
    key_events: List[DiagnosticEvent] = Field(default_factory=list)
    html_content: Optional[str] = None
    csv_metrics_content: Optional[str] = None
