import os
import platform
import shutil
import socket
import subprocess
import sys
from typing import Any

from apps.backend.adapters.runtime.base import BaseRuntimeAdapter
from shared.schemas.runtime import RuntimeRole, RuntimeType


class WindowsRuntimeAdapter(BaseRuntimeAdapter):
    """
    Adapter for discovering and validating native Windows execution capabilities.
    Accurately reports whether native Windows SIPp or compatible binaries are installed.
    """

    def __init__(
        self,
        runtime_id: str = "win-native-local",
        name: str = "Local Windows Host",
        role: RuntimeRole = RuntimeRole.STANDALONE,
        custom_sipp_path: str | None = None
    ):
        super().__init__(runtime_id, name, RuntimeType.NATIVE_WINDOWS, role)
        self.custom_sipp_path = custom_sipp_path

    def detect_os(self) -> dict[str, Any]:
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "is_windows": platform.system().lower() == "windows",
        }

    def discover_python(self) -> dict[str, Any]:
        return {
            "available": True,
            "version": platform.python_version(),
            "executable": sys.executable,
            "implementation": platform.python_implementation(),
        }

    def discover_sipp(self) -> dict[str, Any]:
        # Search for sipp or sipp.exe
        candidate_paths = []
        if self.custom_sipp_path:
            candidate_paths.append(self.custom_sipp_path)

        which_sipp = shutil.which("sipp") or shutil.which("sipp.exe")
        if which_sipp:
            candidate_paths.append(which_sipp)

        # Standard Windows locations if any
        common_locations = [
            r"C:\Program Files\sipp\sipp.exe",
            r"C:\sipp\sipp.exe",
            r"C:\tools\sipp\sipp.exe"
        ]
        candidate_paths.extend([p for p in common_locations if os.path.isfile(p)])

        valid_path = None
        version_str = None

        for path in candidate_paths:
            try:
                res = subprocess.run(
                    [path, "-v"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    timeout=3
                )
                output = res.stdout
                for line in output.splitlines():
                    if "SIPp" in line or "sipp" in line.lower():
                        version_str = line.strip()
                        valid_path = path
                        break
                if valid_path:
                    break
            except Exception:
                continue

        if valid_path:
            return {
                "available": True,
                "path": valid_path,
                "version": version_str,
                "is_native_binary": True
            }

        return {
            "available": False,
            "path": None,
            "version": None,
            "setup_instructions": [
                "Native Windows SIPp binary not found in system PATH.",
                "To execute SIPp traffic natively on Windows, install a compiled Windows SIPp build (e.g. from GitHub releases or Cygwin) and set its directory in PATH.",
                "Alternatively, configure WSL2 or remote Linux test hosts (172.19.112.50 / 60) for SIPp scenario execution."
            ]
        }

    def discover_network(self) -> list[dict[str, Any]]:
        interfaces: list[dict[str, Any]] = []
        try:
            hostname = socket.gethostname()
            _, _, ips = socket.gethostbyname_ex(hostname)
            for ip in ips:
                interfaces.append({
                    "name": hostname,
                    "address": ip,
                    "family": "IPv4",
                    "is_loopback": ip.startswith("127.")
                })
        except Exception as e:
            interfaces.append({"name": "error", "address": "127.0.0.1", "details": str(e)})

        # Always include loopback
        if not any(i.get("address") == "127.0.0.1" for i in interfaces):
            interfaces.insert(0, {"name": "localhost", "address": "127.0.0.1", "family": "IPv4", "is_loopback": True})

        return interfaces

    def check_directory_access(self) -> dict[str, Any]:
        cwd = os.getcwd()
        can_read = os.access(cwd, os.R_OK)
        can_write = os.access(cwd, os.W_OK)
        return {
            "working_directory": cwd,
            "can_read": can_read,
            "can_write": can_write,
            "assets_accessible": os.path.isdir(os.path.join(cwd, "assets")),
        }

    def check_process_capabilities(self) -> dict[str, Any]:
        return {
            "can_spawn_processes": True,
            "pid": os.getpid(),
            "has_tasklist": shutil.which("tasklist") is not None,
        }
