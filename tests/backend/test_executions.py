from fastapi.testclient import TestClient

from apps.backend.main import app
from apps.backend.services.command_builder import SippCommandBuilder

client = TestClient(app)


def test_command_builder_uac_and_uas():
    builder = SippCommandBuilder(sipp_binary="sipp")

    uac_cmd = builder.build_uac_command(
        scenario_xml="assets/sipp/INVITE_Caller_Auth_PRACK.xml",
        target_ip="172.19.112.51",
        target_port=5060,
        local_port=5060,
        csv_file="test.csv",
        rate=15.0,
        call_count=50,
        transport="UDP",
        trace_screen=True,
    )

    assert uac_cmd[0] == "sipp"
    assert uac_cmd[1] == "172.19.112.51:5060"
    assert "-sf" in uac_cmd
    assert "-inf" in uac_cmd
    assert "-r" in uac_cmd
    assert "15.0" in uac_cmd
    assert "-m" in uac_cmd
    assert "50" in uac_cmd
    assert "-t" in uac_cmd
    assert "u1" in uac_cmd

    uas_cmd = builder.build_uas_command(
        scenario_xml="assets/sipp/INVITE_Called.xml",
        local_port=5080,
        transport="TCP",
    )
    assert uas_cmd[0] == "sipp"
    assert "-sf" in uas_cmd
    assert "-p" in uas_cmd
    assert "5080" in uas_cmd
    assert "t1" in uas_cmd


def test_execution_creation_physical_safety_gate():
    # Attempting PHYSICAL without confirmation must fail
    payload = {
        "environment_id": "env-local-simulation",
        "scenario_id": "invite-caller-auth-prack",
        "mode": "PHYSICAL",
        "confirm_physical_execution": False,
    }
    res = client.post("/api/v1/executions", json=payload)
    assert res.status_code == 400
    assert "confirmation" in res.json()["detail"].lower()


def test_execution_lifecycle_and_orchestration_simulated():
    # Create simulated execution
    payload = {
        "environment_id": "env-local-simulation",
        "scenario_id": "invite-caller-auth-prack",
        "mode": "SIMULATED",
        "call_rate": 20.0,
        "call_count": 20,
    }
    res = client.post("/api/v1/executions", json=payload)
    assert res.status_code == 201
    data = res.json()
    exec_id = data["id"]
    assert exec_id.startswith("exec-")
    assert data["mode"] == "SIMULATED"

    # Poll status
    res_get = client.get(f"/api/v1/executions/{exec_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == exec_id

    # Get metrics
    res_metrics = client.get(f"/api/v1/executions/{exec_id}/metrics")
    assert res_metrics.status_code == 200
    assert "total_calls" in res_metrics.json()

    # Get logs
    res_logs = client.get(f"/api/v1/executions/{exec_id}/logs")
    assert res_logs.status_code == 200
    assert len(res_logs.json()) > 0

    # Diagnostics endpoint
    res_diag = client.get(f"/api/v1/diagnostics/{exec_id}")
    assert res_diag.status_code == 200
    diag_data = res_diag.json()
    assert "events" in diag_data

    # Reporting endpoint
    res_rep = client.get(f"/api/v1/reports/{exec_id}")
    assert res_rep.status_code == 200
    rep_data = res_rep.json()
    assert rep_data["execution_id"] == exec_id
    assert rep_data["mode"] == "SIMULATED"

    # HTML report
    res_html = client.get(f"/api/v1/reports/{exec_id}?format=HTML")
    assert res_html.status_code == 200
    assert "text/html" in res_html.headers["content-type"]
    assert "OXE SIP Test Execution Report" in res_html.text

    # CSV report
    res_csv = client.get(f"/api/v1/reports/{exec_id}?format=CSV")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "execution_id,mode,state" in res_csv.text

    # Stop execution safely
    res_stop = client.post(f"/api/v1/executions/{exec_id}/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["state"] in ("STOPPING", "CANCELLED", "COMPLETED")
