from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.backend.core.database import get_db
from apps.backend.services.preflight_service import PreflightValidationService
from shared.schemas.preflight import PreflightRequest, PreflightResult

router = APIRouter()


@router.post("/validate", response_model=PreflightResult)
def run_preflight_validation(request: PreflightRequest, db: Session = Depends(get_db)):
    """
    Execute comprehensive preflight validation across Environment, Runtimes,
    Scenario XML, Subscriber CSV parameters, and Port availability.
    """
    service = PreflightValidationService(db=db)
    return service.run_preflight(request)
