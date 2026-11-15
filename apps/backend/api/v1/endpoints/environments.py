
from fastapi import APIRouter, HTTPException, status

from apps.backend.services.environment_service import get_environment_manager
from shared.schemas.environment import (
    EnvironmentCreateRequest,
    EnvironmentProfileExport,
    EnvironmentResponse,
    EnvironmentUpdateRequest,
    EnvironmentValidationResult,
)

router = APIRouter()


@router.get("", response_model=list[EnvironmentResponse], summary="List all environments")
def list_environments():
    """Retrieve all saved test environment profiles."""
    return get_environment_manager().list_environments()


@router.post("", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED, summary="Create environment")
def create_environment(req: EnvironmentCreateRequest):
    """Create a new test environment profile and validate associated runtimes."""
    return get_environment_manager().create_environment(req)


@router.post("/import", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED, summary="Import environment profile")
def import_environment(profile: dict):
    """Import a reusable environment configuration profile (no secrets required)."""
    return get_environment_manager().import_profile(profile)


@router.get("/{env_id}", response_model=EnvironmentResponse, summary="Get environment by ID")
def get_environment(env_id: str):
    """Retrieve a specific environment profile by its identifier."""
    env = get_environment_manager().get_environment(env_id)
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )
    return env


@router.put("/{env_id}", response_model=EnvironmentResponse, summary="Update environment")
def update_environment(env_id: str, req: EnvironmentUpdateRequest):
    """Update environment parameters, PBX IP, or runtime associations."""
    env = get_environment_manager().update_environment(env_id, req)
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )
    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete environment")
def delete_environment(env_id: str):
    """Delete an environment profile."""
    success = get_environment_manager().delete_environment(env_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )


@router.post("/{env_id}/validate", response_model=EnvironmentValidationResult, summary="Validate environment readiness")
def validate_environment(env_id: str):
    """Perform end-to-end readiness validation for CALLER, CALLED, and PBX configuration."""
    res = get_environment_manager().validate_environment(env_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )
    return res


@router.post("/{env_id}/activate", response_model=EnvironmentResponse, summary="Set active environment")
def activate_environment(env_id: str):
    """Mark this environment as the active target for test execution."""
    env = get_environment_manager().set_active_environment(env_id)
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )
    return env


@router.post("/{env_id}/duplicate", response_model=EnvironmentResponse, summary="Duplicate environment profile")
def duplicate_environment(env_id: str):
    """Clone an existing environment profile."""
    env = get_environment_manager().duplicate_environment(env_id)
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )
    return env


@router.get("/{env_id}/export", response_model=EnvironmentProfileExport, summary="Export environment profile")
def export_environment_profile(env_id: str):
    """Export reusable profile configuration without credentials."""
    profile = get_environment_manager().export_profile(env_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with ID '{env_id}' not found."
        )
    return profile
