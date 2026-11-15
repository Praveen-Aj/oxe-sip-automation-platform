from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.backend.adapters.runtime.manager import get_runtime_manager
from apps.backend.adapters.runtime.remote_linux import RemoteLinuxRuntimeAdapter
from apps.backend.main import app
from apps.backend.services.environment_service import get_environment_manager
from shared.schemas.runtime import (
    RuntimeDiagnostics,
    RuntimeValidationResult,
    RuntimeValidationStatus,
)


@pytest.fixture(autouse=True)
def setup_services():
    # Ensure fresh in-memory or test database state
    get_runtime_manager().discover_local_runtimes()
    get_environment_manager()


# ==========================================
# 1. Runtime API Endpoint Tests
# ==========================================

@pytest.mark.asyncio
async def test_runtimes_api_endpoints():
    mock_val = RuntimeValidationResult(
        runtime_id="rt-mock",
        status=RuntimeValidationStatus.READY,
        sipp_available=True,
        sipp_version="3.6.1",
        can_execute=True,
        diagnostics=RuntimeDiagnostics(os_info={"system": "Linux", "release": "5.15.0"})
    )

    with patch.object(RemoteLinuxRuntimeAdapter, "validate", return_value=mock_val):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. List
            res = await ac.get("/api/v1/runtimes")
            assert res.status_code == 200
            runtimes = res.json()
            assert len(runtimes) > 0

            # 2. Get specific local runtime
            rt_id = runtimes[0]["id"]
            res_get = await ac.get(f"/api/v1/runtimes/{rt_id}")
            assert res_get.status_code == 200
            assert res_get.json()["id"] == rt_id

            # 3. Create remote SSH runtime
            create_payload = {
                "name": "Lab Linux Caller Node",
                "runtime_type": "REMOTE_LINUX",
                "role": "CALLER",
                "hostname": "172.19.112.50",
                "port": 22,
                "username": "sipadmin",
                "ssh_auth": {
                    "auth_method": "KEY",
                    "key_path": "/home/sipadmin/.ssh/id_rsa",
                    "password": "SecretPassword123"
                }
            }
            res_create = await ac.post("/api/v1/runtimes", json=create_payload)
            assert res_create.status_code == 201
            created_rt = res_create.json()
            new_id = created_rt["id"]
            assert created_rt["name"] == "Lab Linux Caller Node"
            # Invariant: Password MUST be masked and never returned in plain text!
            assert "SecretPassword123" not in str(created_rt)

            # 4. Update runtime
            res_update = await ac.put(f"/api/v1/runtimes/{new_id}", json={"name": "Updated Caller Node"})
            assert res_update.status_code == 200
            assert res_update.json()["name"] == "Updated Caller Node"

            # 5. Delete runtime
            res_del = await ac.delete(f"/api/v1/runtimes/{new_id}")
            assert res_del.status_code == 204

            # 6. Verify 404 on deleted
            res_404 = await ac.get(f"/api/v1/runtimes/{new_id}")
            assert res_404.status_code == 404


# ==========================================
# 2. Environment API Endpoint Tests
# ==========================================

@pytest.mark.asyncio
async def test_environments_api_crud_and_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. List default environments
        res = await ac.get("/api/v1/environments")
        assert res.status_code == 200
        envs = res.json()
        assert len(envs) >= 2
        # Verify demo flag is correctly present
        assert any(e["is_demo"] is True for e in envs)

        # 2. Create new environment with missing/invalid runtimes (should report WARNING)
        new_env_payload = {
            "name": "Integration Staging Lab",
            "description": "Multi-node test environment with remote hosts",
            "pbx_host": "172.19.112.51",
            "pbx_port": 5060,
            "pbx_domain": "oxe.staging.enterprise",
            "trunk_group": 10,
            "caller_host": "172.19.112.50",
            "caller_port": 5060,
            "called_host": "172.19.112.60",
            "called_port": 5080,
            "sip_transport": "UDP",
            "is_demo": False
        }
        res_create = await ac.post("/api/v1/environments", json=new_env_payload)
        assert res_create.status_code == 201
        env_data = res_create.json()
        env_id = env_data["id"]
        assert env_data["name"] == "Integration Staging Lab"
        assert env_data["status"] == "WARNING"  # No runtimes associated yet

        # 3. Validate endpoint
        res_val = await ac.post(f"/api/v1/environments/{env_id}/validate")
        assert res_val.status_code == 200
        val_res = res_val.json()
        assert val_res["overall_status"] == "WARNING"
        assert len(val_res["warnings"]) > 0

        # 4. Activate environment
        res_act = await ac.post(f"/api/v1/environments/{env_id}/activate")
        assert res_act.status_code == 200
        assert res_act.json()["is_active"] is True

        # 5. Delete environment
        res_del = await ac.delete(f"/api/v1/environments/{env_id}")
        assert res_del.status_code == 204
