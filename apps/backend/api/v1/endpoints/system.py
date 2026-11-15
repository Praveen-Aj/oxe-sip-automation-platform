from fastapi import APIRouter

from apps.backend.core.config import settings
from apps.backend.services.runner_service import get_runner
from shared.schemas.telemetry import ConfigResponse, HealthResponse, RunnerTypeEnum

router = APIRouter()

@router.get("/health", response_model=HealthResponse, summary="System Health Check")
def health_check():
    runner = get_runner()
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        mode=settings.ENVIRONMENT,
        active_runner=runner.get_capabilities().runner_name
    )

@router.get("/config", response_model=ConfigResponse, summary="Application Configuration")
def get_config():
    return ConfigResponse(
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        api_prefix=settings.API_V1_STR,
        environment=settings.ENVIRONMENT,
        active_runner_type=RunnerTypeEnum.SIMULATED,
        available_runners=[
            "SIMULATED (Built-in Prototype)",
            "LOCAL_WINDOWS (Native Win32 - Optional)",
            "LOCAL_WSL (WSL2 Ubuntu - Optional)",
            "REMOTE_CALLER (172.19.112.50 - Future)",
            "REMOTE_CALLED (172.19.112.60 - Future)"
        ]
    )
