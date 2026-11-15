from fastapi import APIRouter

from apps.backend.api.v1.endpoints import (
    configurations,
    diagnostics,
    environments,
    executions,
    preflight,
    reports,
    runner,
    runtimes,
    scenarios,
    system,
)

api_router = APIRouter()
api_router.include_router(system.router, prefix="/system", tags=["System & Health"])
api_router.include_router(runner.router, prefix="/runner", tags=["Runner Interface"])
api_router.include_router(runtimes.router, prefix="/runtimes", tags=["Runtime Manager"])
api_router.include_router(environments.router, prefix="/environments", tags=["Environment Manager"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenario Catalogue"])
api_router.include_router(configurations.router, prefix="/configurations", tags=["Configuration Engine"])
api_router.include_router(preflight.router, prefix="/preflight", tags=["Preflight Validation Engine"])
api_router.include_router(executions.router, prefix="/executions", tags=["Execution Orchestrator"])
api_router.include_router(diagnostics.router, prefix="/diagnostics", tags=["Execution Diagnostics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reporting Engine"])
