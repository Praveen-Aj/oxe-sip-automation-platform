import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from apps.backend.api.v1.router import api_router
from apps.backend.core.config import settings
from apps.backend.core.database import init_db
from apps.backend.core.logging import logger, setup_logging
from apps.backend.services.execution_orchestrator import ExecutionOrchestrationService

setup_logging()
init_db()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

orchestration_service = ExecutionOrchestrationService()

@app.websocket("/ws/executions/{execution_id}/metrics")
async def websocket_execution_metrics(websocket: WebSocket, execution_id: str):
    """
    WebSocket endpoint streaming live SIP metrics and host states
    with heartbeats and freshness timestamps.
    """
    await websocket.accept()
    try:
        while True:
            exec_resp = orchestration_service.get_execution(execution_id)
            if not exec_resp:
                await websocket.send_json({"error": f"Execution {execution_id} not found", "is_final": True})
                break

            data = {
                "execution_id": execution_id,
                "state": exec_resp.state.value,
                "metrics": exec_resp.metrics.model_dump(mode="json"),
                "caller_host": exec_resp.caller_host.model_dump(mode="json"),
                "called_host": exec_resp.called_host.model_dump(mode="json"),
                "timestamp": exec_resp.metrics.timestamp.isoformat(),
                "is_final": exec_resp.state in ("COMPLETED", "FAILED", "CANCELLED"),
            }
            await websocket.send_json(data)

            if data["is_final"]:
                break

            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from metrics websocket for {execution_id}")
    except Exception as e:
        logger.error(f"Error in metrics websocket for {execution_id}: {e}")


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION} on {settings.ENVIRONMENT}")

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/system/health"
    }
