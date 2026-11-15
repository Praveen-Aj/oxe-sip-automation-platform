from fastapi import APIRouter, HTTPException

from apps.backend.services.runner_service import get_runner
from shared.schemas.telemetry import (
    ExecutionStatusResponse,
    RunnerCapabilities,
    RunnerStatus,
    StartExecutionRequest,
)

router = APIRouter()

@router.get("/capabilities", response_model=RunnerCapabilities, summary="Runner Capabilities")
def get_capabilities():
    return get_runner().get_capabilities()

@router.get("/status", response_model=RunnerStatus, summary="Runner Live Status")
def get_runner_status():
    return get_runner().get_status()

@router.post("/start", response_model=ExecutionStatusResponse, summary="Start Execution")
def start_execution(req: StartExecutionRequest):
    return get_runner().start_execution(req)

@router.post("/stop/{execution_id}", response_model=ExecutionStatusResponse, summary="Stop Execution")
def stop_execution(execution_id: str):
    runner = get_runner()
    if runner.active_execution_id != execution_id and execution_id != "all":
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found or already terminated")
    return runner.stop_execution(execution_id)

@router.get("/execution/{execution_id}", response_model=ExecutionStatusResponse, summary="Execution Details")
def get_execution(execution_id: str):
    runner = get_runner()
    if runner.active_execution_id != execution_id:
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found")
    return runner.get_execution_status(execution_id)
