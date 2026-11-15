import os

from fastapi.testclient import TestClient

from apps.backend.main import app
from apps.backend.services.csv_generator import CSVGeneratorService

client = TestClient(app)


def test_csv_generator_caller_call():
    gen = CSVGeneratorService()
    file_path, preview = gen.generate_caller_call_csv(
        caller_start=55001,
        caller_end=55005,
        called_start=55011,
        called_end=55015,
        oxe_ip="172.19.112.51",
        oxe_port=5060,
        auth_enabled=True,
        auth_password="test_secret_pw",
        prefix_tag="unit_test"
    )

    assert file_path.exists()
    assert preview.total_rows == 5
    assert preview.delimiter == ";"
    assert "field4" in preview.headers

    # Read actual file content
    content = file_path.read_text(encoding="utf-8")
    lines = content.strip().split("\n")
    assert lines[0] == "SEQUENTIAL;field0;field1;field2;field3;field4"
    assert "55001;55011;172.19.112.51;5060;[authentication username=55001 password=test_secret_pw]" in lines[1]

    # Verify POSIX chmod or Windows default
    if os.name == "posix":
        assert "600" in preview.permissions


def test_csv_generator_registration():
    gen = CSVGeneratorService()
    file_path, preview = gen.generate_registration_csv(
        range_start=55001,
        range_end=55003,
        oxe_ip="172.19.112.51",
        role="CALLER",
        auth_enabled=False,
        prefix_tag="reg_test"
    )

    assert file_path.exists()
    assert preview.total_rows == 3
    content = file_path.read_text(encoding="utf-8")
    lines = content.strip().split("\n")
    assert lines[0] == "SEQUENTIAL;field0;field1"
    assert "55001;172.19.112.51" in lines[1]


def test_csv_generator_injection_sanitization():
    gen = CSVGeneratorService()
    # Test formula injection and delimiter corruption
    clean = gen._sanitize_value("=cmd|'/C calc'!A0")
    assert clean.startswith("'=")

    clean_semi = gen._sanitize_value("secret;password\nline2")
    assert ";" not in clean_semi
    assert "\n" not in clean_semi


def test_configurations_api_crud_and_csv_generation():
    # 1. Create Configuration
    payload = {
        "name": "E2E Unit Test Configuration",
        "description": "Validation profile for authentication + PRACK",
        "environment_id": "lab-staging",
        "scenario_id": "invite-caller-auth-prack",
        "caller_range_start": 55001,
        "caller_range_end": 55005,
        "called_range_start": 55011,
        "called_range_end": 55015,
        "caller_port": 5060,
        "called_port": 5080,
        "transport": "UDP",
        "call_rate": 15.0,
        "call_count": 50,
        "auth_enabled": True,
        "auth_password": "supersecretpassword",
        "prack_enabled": True,
        "media_enabled": True,
        "codec": "PCMA"
    }

    res_create = client.post("/api/v1/configurations", json=payload)
    assert res_create.status_code == 200
    cfg = res_create.json()
    cfg_id = cfg["id"]
    assert cfg["name"] == payload["name"]
    assert cfg["auth_password_masked"] == "********"

    # 2. List Configurations
    res_list = client.get("/api/v1/configurations")
    assert res_list.status_code == 200
    ids = [c["id"] for c in res_list.json()]
    assert cfg_id in ids

    # 3. Get Configuration
    res_get = client.get(f"/api/v1/configurations/{cfg_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == cfg_id

    # 4. Update Configuration
    res_up = client.put(f"/api/v1/configurations/{cfg_id}", json={"call_rate": 25.0})
    assert res_up.status_code == 200
    assert res_up.json()["call_rate"] == 25.0

    # 5. Duplicate Configuration
    res_dup = client.post(f"/api/v1/configurations/{cfg_id}/duplicate")
    assert res_dup.status_code == 200
    dup_id = res_dup.json()["id"]
    assert dup_id != cfg_id
    assert "Copy of" in res_dup.json()["name"]

    # 6. Generate CSV for Configuration
    res_csv = client.post(f"/api/v1/configurations/{cfg_id}/generate-csv")
    assert res_csv.status_code == 200
    csv_data = res_csv.json()
    assert csv_data["total_rows"] == 5
    assert csv_data["delimiter"] == ";"

    # 7. Delete Configurations
    assert client.delete(f"/api/v1/configurations/{cfg_id}").status_code == 200
    assert client.delete(f"/api/v1/configurations/{dup_id}").status_code == 200
    assert client.get(f"/api/v1/configurations/{cfg_id}").status_code == 404
