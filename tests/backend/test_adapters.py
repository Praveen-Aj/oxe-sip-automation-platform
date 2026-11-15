import subprocess
from unittest.mock import patch

from apps.backend.adapters.runtime.linux import LinuxRuntimeAdapter
from apps.backend.adapters.runtime.remote_linux import RemoteLinuxRuntimeAdapter
from apps.backend.adapters.runtime.windows import WindowsRuntimeAdapter
from apps.backend.adapters.runtime.windows_wsl import WindowsWslRuntimeAdapter
from shared.schemas.runtime import RuntimeValidationStatus, SshAuthConfig

# ==========================================
# 1. Windows Adapter Tests
# ==========================================

def test_windows_adapter_sipp_available():
    adapter = WindowsRuntimeAdapter(runtime_id="win-test-1")

    with patch("shutil.which", return_value=r"C:\tools\sipp\sipp.exe"), \
         patch("subprocess.run") as mock_run:
        mock_run.return_value = subprocess.CompletedProcess(
            args=["sipp", "-v"],
            returncode=0,
            stdout="SIPp v3.7.2-Windows-x64 built Nov 14 2026\n"
        )
        res = adapter.validate()
        assert res.sipp_available is True
        assert "v3.7.2" in (res.sipp_version or "")
        assert res.can_execute is True
        assert res.status == RuntimeValidationStatus.READY


def test_windows_adapter_sipp_unavailable():
    adapter = WindowsRuntimeAdapter(runtime_id="win-test-2")

    with patch("shutil.which", return_value=None), \
         patch("os.path.isfile", return_value=False):
        res = adapter.validate()
        assert res.sipp_available is False
        assert res.sipp_version is None
        assert res.can_execute is False
        assert res.status == RuntimeValidationStatus.UNAVAILABLE
        assert len(res.diagnostics.missing_prerequisites) > 0


# ==========================================
# 2. WSL2 Adapter Tests
# ==========================================

def test_wsl_adapter_not_installed():
    adapter = WindowsWslRuntimeAdapter(runtime_id="wsl-test-1")

    with patch("shutil.which", return_value=None):
        res = adapter.validate()
        assert res.status == RuntimeValidationStatus.UNAVAILABLE
        assert res.can_execute is False
        assert res.diagnostics.os_info.get("wsl_installed") is False


def test_wsl_adapter_installed_without_distributions():
    adapter = WindowsWslRuntimeAdapter(runtime_id="wsl-test-2")

    with patch("shutil.which", return_value=r"C:\Windows\System32\wsl.exe"), \
         patch("subprocess.run") as mock_run:
        # Simulate wsl.exe reporting no distributions installed
        mock_run.return_value = subprocess.CompletedProcess(
            args=["wsl.exe", "--list", "--verbose"],
            returncode=0,
            stdout=b"Windows Subsystem for Linux has no installed distributions.\n"
        )
        res = adapter.validate()
        assert res.status == RuntimeValidationStatus.UNAVAILABLE
        assert res.diagnostics.os_info.get("has_distributions") is False
        assert len(res.diagnostics.setup_instructions) > 0
        assert "wsl --install" in res.diagnostics.setup_instructions[1]


def test_wsl_adapter_distribution_available_with_sipp():
    adapter = WindowsWslRuntimeAdapter(runtime_id="wsl-test-3", wsl_distribution="Ubuntu")

    wsl_list_output = (
        b"  NAME      STATE           VERSION\n"
        b"* Ubuntu    Running         2\n"
    )

    def side_effect(cmd, **kwargs):
        if "--list" in cmd:
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout=wsl_list_output)
        elif "which" in cmd and "sipp" in cmd:
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="/usr/bin/sipp\n")
        elif "sipp" in cmd and "-v" in cmd:
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="SIPp v3.6.1-Linux\n")
        elif "python3" in cmd:
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="Python 3.10.12\n")
        return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="")

    with patch("shutil.which", return_value=r"C:\Windows\System32\wsl.exe"), \
         patch("subprocess.run", side_effect=side_effect):
        res = adapter.validate()
        assert res.sipp_available is True
        assert res.can_execute is True
        assert res.status == RuntimeValidationStatus.READY


# ==========================================
# 3. Linux Adapter Tests
# ==========================================

def test_linux_adapter_sipp_available():
    adapter = LinuxRuntimeAdapter(runtime_id="linux-test-1")

    with patch("platform.system", return_value="Linux"), \
         patch("shutil.which", return_value="/usr/bin/sipp"), \
         patch("subprocess.run") as mock_run:
        mock_run.return_value = subprocess.CompletedProcess(
            args=["/usr/bin/sipp", "-v"],
            returncode=0,
            stdout="SIPp v3.6.1-Linux-Debian\n"
        )
        res = adapter.validate()
        assert res.sipp_available is True
        assert "v3.6.1" in (res.sipp_version or "")
        assert res.status == RuntimeValidationStatus.READY


def test_linux_adapter_sipp_unavailable():
    adapter = LinuxRuntimeAdapter(runtime_id="linux-test-2")

    with patch("platform.system", return_value="Linux"), \
         patch("shutil.which", return_value=None), \
         patch("os.path.isfile", return_value=False):
        res = adapter.validate()
        assert res.sipp_available is False
        assert res.status == RuntimeValidationStatus.UNAVAILABLE


# ==========================================
# 4. Remote Linux SSH Tests
# ==========================================

def test_remote_linux_ssh_connection_failure():
    adapter = RemoteLinuxRuntimeAdapter(
        runtime_id="ssh-test-fail",
        name="Offline Remote Host",
        hostname="192.168.99.99",
        connect_timeout=1.0
    )

    with patch.object(adapter, "_execute_remote", side_effect=subprocess.TimeoutExpired(cmd="ssh", timeout=1.0)):
        res = adapter.validate()
        assert res.can_execute is False
        assert res.status in (RuntimeValidationStatus.ERROR, RuntimeValidationStatus.UNAVAILABLE)
        assert any("timed out" in err for err in res.errors)


def test_remote_linux_ssh_auth_failure():
    adapter = RemoteLinuxRuntimeAdapter(
        runtime_id="ssh-test-auth-fail",
        name="Auth Rejected Host",
        hostname="172.19.112.50",
        ssh_auth=SshAuthConfig(auth_method="KEY", key_path="/invalid/key")
    )

    auth_error_proc = subprocess.CompletedProcess(
        args=["ssh"],
        returncode=255,
        stdout="",
        stderr="Permission denied (publickey,password)."
    )

    with patch.object(adapter, "_execute_remote", return_value=auth_error_proc):
        res = adapter.validate()
        assert res.can_execute is False
        assert res.status == RuntimeValidationStatus.ERROR


def test_remote_linux_sipp_available():
    adapter = RemoteLinuxRuntimeAdapter(
        runtime_id="ssh-caller-node",
        name="Remote CALLER Node",
        hostname="172.19.112.50",
    )

    def mock_remote(args):
        if "uname" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Linux 5.15.0-generic x86_64\n")
        elif "which" in args and "python3" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/python3\n")
        elif "python3" in args and "--version" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Python 3.10.6\n")
        elif "which" in args and "sipp" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/sipp\n")
        elif "/usr/bin/sipp" in args and "-v" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="SIPp v3.6.1-Debian\n")
        elif "test" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="OK\n")
        elif "ps" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="UID PID ...\n")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

    with patch.object(adapter, "_execute_remote", side_effect=mock_remote):
        res = adapter.validate()
        assert res.sipp_available is True
        assert "v3.6.1" in (res.sipp_version or "")
        assert res.can_execute is True
        assert res.status == RuntimeValidationStatus.READY


def test_remote_linux_sipp_unavailable():
    adapter = RemoteLinuxRuntimeAdapter(
        runtime_id="ssh-called-node",
        name="Remote CALLED Node Missing SIPp",
        hostname="172.19.112.60",
    )

    def mock_remote(args):
        if "uname" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Linux 5.15.0-generic x86_64\n")
        elif "which" in args and "python3" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="/usr/bin/python3\n")
        elif "python3" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="Python 3.10.6\n")
        elif "which" in args and "sipp" in args:
            return subprocess.CompletedProcess(args=args, returncode=1, stdout="")
        elif "test" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="OK\n")
        elif "ps" in args:
            return subprocess.CompletedProcess(args=args, returncode=0, stdout="UID PID ...\n")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="")

    with patch.object(adapter, "_execute_remote", side_effect=mock_remote):
        res = adapter.validate()
        assert res.sipp_available is False
        assert res.status == RuntimeValidationStatus.UNAVAILABLE
        assert any("Install SIPp" in s for s in res.diagnostics.setup_instructions)
