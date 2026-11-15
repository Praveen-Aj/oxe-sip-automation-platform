
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from apps.backend.core.database import get_db
from apps.backend.services.configuration_service import ConfigurationService
from shared.schemas.configuration import (
    CSVPreviewResponse,
    TestConfigurationCreate,
    TestConfigurationResponse,
    TestConfigurationUpdate,
)

router = APIRouter()


@router.post("", response_model=TestConfigurationResponse)
def create_configuration(config_in: TestConfigurationCreate, db: Session = Depends(get_db)):
    """Create and persist a new test configuration."""
    service = ConfigurationService(db=db)
    return service.create_configuration(config_in)


@router.get("", response_model=list[TestConfigurationResponse])
def list_configurations(
    environment_id: str | None = Query(None, description="Filter by environment ID"),
    scenario_id: str | None = Query(None, description="Filter by scenario ID"),
    db: Session = Depends(get_db),
):
    """List saved test configurations."""
    service = ConfigurationService(db=db)
    return service.list_configurations(environment_id=environment_id, scenario_id=scenario_id)


@router.get("/{config_id}", response_model=TestConfigurationResponse)
def get_configuration(config_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific test configuration by ID."""
    service = ConfigurationService(db=db)
    cfg = service.get_configuration(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Configuration '{config_id}' not found.")
    return cfg


@router.put("/{config_id}", response_model=TestConfigurationResponse)
def update_configuration(config_id: str, update_in: TestConfigurationUpdate, db: Session = Depends(get_db)):
    """Update an existing test configuration."""
    service = ConfigurationService(db=db)
    cfg = service.update_configuration(config_id, update_in)
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Configuration '{config_id}' not found.")
    return cfg


@router.post("/{config_id}/duplicate", response_model=TestConfigurationResponse)
def duplicate_configuration(config_id: str, db: Session = Depends(get_db)):
    """Duplicate an existing test configuration."""
    service = ConfigurationService(db=db)
    cfg = service.duplicate_configuration(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Configuration '{config_id}' not found.")
    return cfg


@router.delete("/{config_id}")
def delete_configuration(config_id: str, db: Session = Depends(get_db)):
    """Delete a test configuration."""
    service = ConfigurationService(db=db)
    success = service.delete_configuration(config_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Configuration '{config_id}' not found.")
    return {"status": "DELETED", "id": config_id}


@router.post("/{config_id}/generate-csv", response_model=CSVPreviewResponse)
def generate_csv_for_configuration(config_id: str, db: Session = Depends(get_db)):
    """Dynamically generate and preview SIPp CSV injection data for a configuration."""
    service = ConfigurationService(db=db)
    try:
        return service.generate_csv_for_configuration(config_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
