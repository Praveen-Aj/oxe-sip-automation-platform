
from fastapi import APIRouter, HTTPException, status

from apps.backend.adapters.runtime.manager import get_runtime_manager
from shared.schemas.runtime import (
    RuntimeCreateRequest,
    RuntimeResponse,
    RuntimeUpdateRequest,
    RuntimeValidationResult,
)

router = APIRouter()


@router.get("", response_model=list[RuntimeResponse], summary="List all execution runtimes")
def list_runtimes():
    """Retrieve all discovered or registered platform runtimes."""
    return get_runtime_manager().list_runtimes()


@router.post("/discover", response_model=list[RuntimeResponse], summary="Auto-discover local runtimes")
def discover_runtimes():
    """Scans local operating system (Windows, WSL2, or Linux) and updates runtime registry."""
    return get_runtime_manager().discover_local_runtimes()


@router.get("/{runtime_id}", response_model=RuntimeResponse, summary="Get runtime by ID")
def get_runtime(runtime_id: str):
    """Retrieve detailed state and diagnostics for a specific runtime."""
    rt = get_runtime_manager().get_runtime(runtime_id)
    if not rt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runtime with ID '{runtime_id}' not found."
        )
    return rt


@router.post("", response_model=RuntimeResponse, status_code=status.HTTP_201_CREATED, summary="Register new runtime")
def create_runtime(req: RuntimeCreateRequest):
    """Register a new remote SSH Linux host or custom execution runtime."""
    return get_runtime_manager().add_runtime(req)


@router.put("/{runtime_id}", response_model=RuntimeResponse, summary="Update runtime configuration")
def update_runtime(runtime_id: str, req: RuntimeUpdateRequest):
    """Update runtime parameters (e.g. host, port, credentials)."""
    rt = get_runtime_manager().update_runtime(runtime_id, req)
    if not rt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runtime with ID '{runtime_id}' not found."
        )
    return rt


@router.delete("/{runtime_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete runtime")
def delete_runtime(runtime_id: str):
    """Delete a registered runtime profile."""
    success = get_runtime_manager().delete_runtime(runtime_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runtime with ID '{runtime_id}' not found."
        )


@router.post("/{runtime_id}/validate", response_model=RuntimeValidationResult, summary="Validate runtime readiness")
def validate_runtime(runtime_id: str):
    """Perform real-time connectivity and SIPp binary validation for a runtime."""
    res = get_runtime_manager().validate_runtime(runtime_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runtime with ID '{runtime_id}' not found."
        )
    return res


@router.post("/{runtime_id}/test-connection", summary="Run detailed connection diagnostics")
def test_connection(runtime_id: str):
    """Run step-by-step SSH connectivity, authentication, discovery, and permission checks."""
    res = get_runtime_manager().test_connection(runtime_id)
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runtime with ID '{runtime_id}' not found."
        )
    return res


@router.get("/{runtime_id}/sipp-install-plan", summary="Get tailored SIPp installation plan")
def get_sipp_install_plan(runtime_id: str):
    """Retrieve Rocky Linux package or source compilation plan for installing SIPp."""
    res = get_runtime_manager().get_sipp_install_plan(runtime_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runtime with ID '{runtime_id}' not found."
        )
    return res
