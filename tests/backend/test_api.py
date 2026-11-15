import pytest
from httpx import ASGITransport, AsyncClient

from apps.backend.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "active_runner" in data


@pytest.mark.asyncio
async def test_config_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/system/config")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "OXE SIP Automation Platform"
    assert "available_runners" in data


@pytest.mark.asyncio
async def test_runner_capabilities():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/runner/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert data["is_simulated"] is True
    assert "INVITE_Caller_Auth_PRACK" in data["supported_scenarios"]


@pytest.mark.asyncio
async def test_simulated_runner_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Start
        start_payload = {
            "scenario_id": "INVITE_Caller_Auth_PRACK",
            "environment_id": "lab_lan",
            "call_rate": 20,
            "call_limit": 50,
            "transport": "UDP"
        }
        res_start = await ac.post("/api/v1/runner/start", json=start_payload)
        assert res_start.status_code == 200
        exec_data = res_start.json()
        exec_id = exec_data["execution_id"]
        assert exec_id.startswith("sim-")
        assert exec_data["state"] == "RUNNING"

        # Check status
        res_stat = await ac.get(f"/api/v1/runner/execution/{exec_id}")
        assert res_stat.status_code == 200
        assert res_stat.json()["is_simulated"] is True

        # Stop
        res_stop = await ac.post(f"/api/v1/runner/stop/{exec_id}")
        assert res_stop.status_code == 200


@pytest.mark.asyncio
async def test_api_error_handling_not_found():
    """Verify 404 response on unknown execution ID."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/runner/execution/non-existent-exec-id")
    assert response.status_code == 404
    error_data = response.json()
    assert "detail" in error_data


@pytest.mark.asyncio
async def test_api_error_handling_invalid_payload():
    """Verify 422 Unprocessable Entity when schema constraints are violated."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # call_rate: -5 violates ge=1 constraint
        response = await ac.post("/api/v1/runner/start", json={"scenario_id": "INVITE_Caller", "call_rate": -5})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_stop_unknown_execution():
    """Verify 404 when attempting to stop non-existent execution."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/runner/stop/invalid-run-999")
    assert response.status_code == 404
