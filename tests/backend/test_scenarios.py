from fastapi.testclient import TestClient

from apps.backend.main import app
from apps.backend.services.scenario_service import ScenarioService
from shared.schemas.scenario import ScenarioFilter, ScenarioRole

client = TestClient(app)


def test_scenario_service_discovery():
    service = ScenarioService()
    scenarios = service.discover_scenarios()
    assert len(scenarios) > 0

    # Verify presence of core established scenarios
    filenames = [s.filename for s in scenarios]
    assert "INVITE_Caller_Auth_PRACK.xml" in filenames
    assert "INVITE_Caller.xml" in filenames
    assert "INVITE_Called.xml" in filenames
    assert "REGISTER.xml" in filenames


def test_scenario_classification_uac_and_uas():
    service = ScenarioService()

    # Test UAC with Auth and PRACK
    auth_prack = service.get_scenario("invite-caller-auth-prack")
    assert auth_prack is not None
    assert auth_prack.role == ScenarioRole.UAC
    assert auth_prack.authentication is True
    assert auth_prack.prack is True
    assert auth_prack.csv_required is True
    assert "field0" in auth_prack.csv_fields
    assert "field1" in auth_prack.csv_fields
    assert "field2" in auth_prack.csv_fields
    assert "field3" in auth_prack.csv_fields
    assert "Authentication + PRACK" in auth_prack.categories

    # Test UAS answering side
    called = service.get_scenario("invite-called")
    assert called is not None
    assert called.role == ScenarioRole.UAS
    assert called.authentication is False

    # Test Registration
    reg = service.get_scenario("register")
    assert reg is not None
    assert reg.role == ScenarioRole.REG
    assert "Registration" in reg.categories


def test_scenario_filter_criteria():
    service = ScenarioService()

    # Filter by role UAS
    uas_list = service.filter_scenarios(ScenarioFilter(role=ScenarioRole.UAS))
    assert all(s.role == ScenarioRole.UAS for s in uas_list)

    # Filter by auth True
    auth_list = service.filter_scenarios(ScenarioFilter(auth=True))
    assert all(s.authentication is True for s in auth_list)

    # Filter by category PRACK
    prack_list = service.filter_scenarios(ScenarioFilter(category="PRACK"))
    assert len(prack_list) > 0


def test_scenarios_api_endpoints():
    # List scenarios
    res = client.get("/api/v1/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0

    # Get single scenario
    first_id = data[0]["id"]
    res_single = client.get(f"/api/v1/scenarios/{first_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == first_id

    # Get raw XML
    res_xml = client.get(f"/api/v1/scenarios/{first_id}/content")
    assert res_xml.status_code == 200
    assert "<scenario" in res_xml.text

    # Re-validate scenario
    res_val = client.post(f"/api/v1/scenarios/{first_id}/validate")
    assert res_val.status_code == 200
    assert res_val.json()["validation_status"] == "VALID"

    # Not found
    res_404 = client.get("/api/v1/scenarios/nonexistent-scenario-999")
    assert res_404.status_code == 404
