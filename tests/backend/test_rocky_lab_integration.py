import subprocess
from unittest.mock import patch

from apps.backend.adapters.runtime.remote_linux import RemoteLinuxRuntimeAdapter
from apps.backend.core.credentials import CredentialCategory, credential_vault
from apps.backend.core.database import SessionLocal
from apps.backend.services.environment_service import get_environment_manager
from apps.backend.services.preflight_service import PreflightValidationService
from apps.backend.services.reporting_service import ReportingService
from shared.schemas.environment import EnvironmentCreateRequest, EnvironmentType, SipTransport
from shared.schemas.preflight import PreflightCheckStatus, PreflightRequest
from shared.schemas.runtime import RuntimeRole, RuntimeValidationStatus, SshAuthConfig


def test_rocky_linux_distro_detection_and_capabilities():
    adapter = RemoteLinuxRuntimeAdapter(
        runtime_id="rt-rocky-lab",
        name="Rocky Linux 9 Lab Host",
        hostname="172.19.112.50",
        role=RuntimeRole.CALLER_CALLED,
        ssh_auth=SshAuthConfig(auth_method="KEY", key_path="~/.ssh/id_rsa"),
    )

    def mock_ssh(args):
        if "uname" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Linux 5.14.0-362.8.1.el9_3.x86_64 x86_64\n")
        elif "/etc/os-release" in args:
            content = """NAME="Rocky Linux"\nVERSION_ID="9.3"\nID="rocky"\nID_LIKE="rhel centos fedora"\nPRETTY_NAME="Rocky Linux 9.3 (Blue Onyx)"\n"""
            return subprocess.CompletedProcess(args=args, returncode=0, stdout=content)
        elif "nproc" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="8\n")
        elif "free" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="total used free\nMem: 16000 4000 12000\n")
        elif "df" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Filesystem 1M-blocks Used Available\n/dev/sda1 100000 20000 80000\n")
        elif "which" in args and "python3" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/python3\n")
        elif "python3" in args and "--version" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Python 3.9.18\n")
        elif "which" in args and "dnf" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/dnf\n")
        elif "which" in args and "sipp" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/sipp\n")
        elif "/usr/bin/sipp" in args and "-v" in args:
            return subprocess.CompletedProcess(
                args=args,
                returncode=0,
                stdout="SIPp v3.7.1-TLS-PCAP-SCTP\nCompiled with OpenSSL, PCAP play, and SCTP.\n"
            )
        elif "test" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="OK\n")
        elif "ps" in args or "kill" in args or "ss" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="OK\n")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

    with patch.object(adapter, "_execute_remote", side_effect=mock_ssh):
        val = adapter.validate()
        assert val.sipp_available is True
        assert "v3.7.1" in (val.sipp_version or "")
        assert val.status == RuntimeValidationStatus.READY

        # Verify Rocky Linux OS details
        os_info = adapter.detect_os()
        assert os_info["is_rocky"] is True
        assert os_info["distro_version"] == "9.3"
        assert "Rocky Linux" in os_info["pretty_name"]

        # Verify Hardware details
        hw = adapter.discover_hardware()
        assert hw["cpu_count"] == 8
        assert hw["memory_mb"] == 16000
        assert hw["disk_free_gb"] > 70.0

        # Verify SIPp capabilities
        sipp_diag = adapter.discover_sipp()
        caps = sipp_diag["capabilities"]
        assert caps["tls"] is True
        assert caps["pcap_playback"] is True
        assert caps["sctp"] is True


def test_rocky_linux_sipp_installation_plan():
    adapter = RemoteLinuxRuntimeAdapter(
        runtime_id="rt-rocky-lab-bare",
        name="Bare Rocky Linux Host",
        hostname="172.19.112.50",
    )

    def mock_ssh(args):
        if "uname" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Linux 5.14.0 x86_64\n")
        elif "/etc/os-release" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout='NAME="Rocky Linux"\nVERSION_ID="9.3"\nID="rocky"\n')
        elif "which" in args and "dnf" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/dnf\n")
        elif "dnf" in args and "info" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Available Packages: sipp\n")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

    with patch.object(adapter, "_execute_remote", side_effect=mock_ssh):
        plan = adapter.get_sipp_install_plan()
        assert plan["package_manager"] == "dnf"
        assert any("epel-release" in cmd for cmd in plan["package_commands"])
        assert any("cmake" in cmd for cmd in plan["source_build_commands"])
        assert plan["requires_root"] is True


def test_secure_credential_vault_masking_and_sanitization():
    runtime_id = "rt-rocky-sec-01"
    ssh_pw = "UltraSecretRockyP@ssword2026!"

    # 1. Store secret in vault
    credential_vault.store_secret(CredentialCategory.SSH, runtime_id, ssh_pw)
    assert credential_vault.has_secret(CredentialCategory.SSH, runtime_id) is True

    # 2. Retrieve secret for internal execution
    retrieved = credential_vault.retrieve_secret(CredentialCategory.SSH, runtime_id)
    assert retrieved == ssh_pw

    # 3. Verify masking helper
    masked = credential_vault.mask_secret(ssh_pw)
    assert masked == "********"
    assert ssh_pw not in masked

    # 4. Verify sanitization removes plaintext secrets from logs/reports
    dirty_log = f"SSH authentication error for admin: {ssh_pw} connecting to 172.19.112.50"
    cleaned = credential_vault.sanitize_text(dirty_log)
    assert ssh_pw not in cleaned
    assert "[REDACTED_SECRET]" in cleaned

    # Clean up
    credential_vault.delete_secret(CredentialCategory.SSH, runtime_id)
    assert credential_vault.has_secret(CredentialCategory.SSH, runtime_id) is False


def test_single_host_port_conflict_validation():
    mgr = get_environment_manager()

    # Create an environment with single-host CALLER & CALLED sharing port 5060 (Collision)
    req_conflict = EnvironmentCreateRequest(
        name="Collision Lab Profile",
        environment_type=EnvironmentType.LAB,
        lab_designation="OXE-LAB-CONFLICT",
        pbx_host="172.19.112.51",
        pbx_port=5060,
        caller_host="172.19.112.50",
        caller_port=5060,
        called_host="172.19.112.50",
        called_port=5060,  # Same port on same IP!
        sip_transport=SipTransport.UDP,
    )
    env_resp = mgr.create_environment(req_conflict)
    assert env_resp.port_conflict is True
    assert "collision" in (env_resp.port_conflict_message or "").lower()

    # Preflight must catch this as a BLOCKER
    preflight_svc = PreflightValidationService(db=SessionLocal())
    preflight_res = preflight_svc.run_preflight(PreflightRequest(
        environment_id=env_resp.id,
        scenario_id="invite-caller-auth-prack",
    ))
    assert preflight_res.is_ready is False
    assert preflight_res.overall_status in ("BLOCKED", PreflightCheckStatus.FAIL)
    assert any("Port Conflict Blocker" in b for b in preflight_res.blockers)

    # Now update environment with isolated ports: CALLER=5062, CALLED=5080
    from shared.schemas.environment import EnvironmentUpdateRequest
    resolved = mgr.update_environment(env_resp.id, EnvironmentUpdateRequest(
        caller_port=5062,
        called_port=5080,
    ))
    assert resolved.port_conflict is False
    assert resolved.caller_port == 5062
    assert resolved.called_port == 5080

    # Cleanup
    mgr.delete_environment(env_resp.id)


def test_environment_profile_export_import():
    mgr = get_environment_manager()

    req = EnvironmentCreateRequest(
        name="OXE Reusable Lab",
        environment_type=EnvironmentType.LAB,
        lab_designation="LAB-EXPORT-TEST",
        pbx_host="172.19.112.51",
        pbx_port=5060,
        caller_host="172.19.112.50",
        caller_port=5062,
        called_host="172.19.112.50",
        called_port=5080,
    )
    env = mgr.create_environment(req)

    # Export
    exported = mgr.export_profile(env.id)
    assert exported is not None
    assert exported.environment_name == "OXE Reusable Lab"
    assert exported.pbx["host"] == "172.19.112.51"
    assert exported.caller["local_port"] == 5062
    assert exported.called["local_port"] == 5080
    # Guarantee no passwords or secrets in export
    export_json = exported.model_dump_json()
    assert "password" not in export_json.lower()
    assert "secret" not in export_json.lower()

    # Import
    imported = mgr.import_profile(exported.model_dump())
    assert imported.id != env.id
    assert imported.pbx_host == "172.19.112.51"
    assert imported.caller_port == 5062
    assert imported.called_port == 5080

    # Cleanup
    mgr.delete_environment(env.id)
    mgr.delete_environment(imported.id)
