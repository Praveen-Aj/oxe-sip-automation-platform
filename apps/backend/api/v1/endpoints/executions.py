
from fastapi import APIRouter, HTTPException, Query, status

from apps.backend.services.execution_orchestrator import ExecutionOrchestrationService
from shared.schemas.execution import (
    ExecutionCreateRequest,
    ExecutionResponse,
    ExecutionStopRequest,
    SIPMetricsSnapshot,
)

router = APIRouter()
orchestrator = ExecutionOrchestrationService()


@router.get("", response_model=list[ExecutionResponse])
def list_executions(limit: int = Query(50, ge=1, le=200)):
    """List recent executions from SQLite persistence."""
    return orchestrator.list_executions(limit=limit)


@router.post("", response_model=ExecutionResponse, status_code=status.HTTP_201_CREATED)
def create_execution(req: ExecutionCreateRequest):
    """
    Initiate a new SIP test execution run.
    Guarantees CALLED UAS startup before CALLER UAC.
    Enforces strict confirmation check for PHYSICAL mode.
    """
    try:
        return orchestrator.create_execution(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{execution_id}", response_model=ExecutionResponse)
def get_execution(execution_id: str):
    """Retrieve full execution status, host process states, and metrics."""
    exec_resp = orchestrator.get_execution(execution_id)
    if not exec_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution '{execution_id}' not found.",
        )
    return exec_resp


@router.post("/{execution_id}/stop", response_model=ExecutionResponse)
def stop_execution(execution_id: str, req: ExecutionStopRequest = ExecutionStopRequest()):
    """Safely stop an active execution, terminating CALLER and CALLED in order."""
    try:
        return orchestrator.stop_execution(execution_id, reason=req.reason or "Stop requested")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{execution_id}/metrics", response_model=SIPMetricsSnapshot)
def get_execution_metrics(execution_id: str):
    """Get latest live or final metrics snapshot."""
    exec_resp = orchestrator.get_execution(execution_id)
    if not exec_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution '{execution_id}' not found.",
        )
    return orchestrator.get_metrics(execution_id)


@router.get("/{execution_id}/logs", response_model=list[str])
def get_execution_logs(execution_id: str):
    """Retrieve live log output lines for an execution."""
    exec_resp = orchestrator.get_execution(execution_id)
    if not exec_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution '{execution_id}' not found.",
        )
    return orchestrator.get_logs(execution_id)
