from fastapi import APIRouter, HTTPException, status

from apps.backend.services.diagnostics_service import DiagnosticsService
from shared.schemas.diagnostics import ExecutionDiagnosticsReport

router = APIRouter()
diagnostics_service = DiagnosticsService()


@router.get("/{execution_id}", response_model=ExecutionDiagnosticsReport)
def get_diagnostics(execution_id: str):
    """Retrieve detailed failure diagnostics and suggested remediations."""
    try:
        return diagnostics_service.analyze_execution(execution_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
