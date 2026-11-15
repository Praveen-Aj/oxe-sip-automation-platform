from fastapi.testclient import TestClient

from apps.backend.main import app

client = TestClient(app)


def test_preflight_validation_demo_environment_ready():
    # Run preflight on local simulated demo environment
    payload = {
        "environment_id": "env-local-simulation",
        "scenario_id": "invite-caller-auth-prack",
        "target_ports": [5060, 5080]
    }

    res = client.post("/api/v1/preflight/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["environment_id"] == "env-local-simulation"
    assert data["scenario_id"] == "invite-caller-auth-prack"
    assert data["is_ready"] is True
    assert data["overall_status"] in ("READY", "WARNING")
    assert len(data["blockers"]) == 0
    assert len(data["checks"]) >= 5


def test_preflight_validation_missing_environment_blocker():
    payload = {
        "environment_id": "nonexistent-env-999",
        "scenario_id": "invite-caller-auth-prack"
    }

    res = client.post("/api/v1/preflight/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_ready"] is False
    assert data["overall_status"] == "BLOCKED"
    assert any("not found" in b.lower() for b in data["blockers"])


def test_preflight_validation_missing_scenario_blocker():
    payload = {
        "environment_id": "env-local-simulation",
        "scenario_id": "nonexistent-scenario-xml-999"
    }

    res = client.post("/api/v1/preflight/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_ready"] is False
    assert data["overall_status"] == "BLOCKED"
    assert any("not found" in b.lower() for b in data["blockers"])


def test_preflight_validation_with_saved_configuration():
    # 1. Create a configuration with deliberate port check
    cfg_payload = {
        "name": "Preflight Test Profile",
        "environment_id": "env-local-simulation",
        "scenario_id": "invite-caller-auth-prack",
        "caller_range_start": 55001,
        "caller_range_end": 55004,
        "called_range_start": 55011,
        "called_range_end": 55014,
        "caller_port": 5060,
        "called_port": 5080,
        "auth_enabled": True,
        "prack_enabled": True
    }
    create_res = client.post("/api/v1/configurations", json=cfg_payload)
    assert create_res.status_code == 200
    cfg_id = create_res.json()["id"]

    try:
        # 2. Run preflight linking configuration
        pf_res = client.post("/api/v1/preflight/validate", json={
            "environment_id": "env-local-simulation",
            "scenario_id": "invite-caller-auth-prack",
            "configuration_id": cfg_id
        })
        assert pf_res.status_code == 200
        pf_data = pf_res.json()
        assert pf_data["configuration_id"] == cfg_id
        assert pf_data["is_ready"] is True
    finally:
        client.delete(f"/api/v1/configurations/{cfg_id}")
