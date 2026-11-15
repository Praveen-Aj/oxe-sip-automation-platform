import os
import platform
import shutil
import socket
import subprocess
import sys
from typing import Any

from apps.backend.adapters.runtime.base import BaseRuntimeAdapter
from shared.schemas.runtime import RuntimeRole, RuntimeType


class LinuxRuntimeAdapter(BaseRuntimeAdapter):
    """
    Adapter for discovering and validating native Linux execution environments.
    Inspects kernel, distribution information, Python, and local SIPp package status.
    """

    def __init__(
        self,
        runtime_id: str = "linux-native-local",
        name: str = "Local Linux Host",
        role: RuntimeRole = RuntimeRole.STANDALONE,
        custom_sipp_path: str | None = None
    ):
        super().__init__(runtime_id, name, RuntimeType.NATIVE_LINUX, role)
        self.custom_sipp_path = custom_sipp_path

    def detect_os(self) -> dict[str, Any]:
        is_linux = platform.system().lower() == "linux"
        distro_info = {}

        if is_linux and os.path.isfile("/etc/os-release"):
            try:
                with open("/etc/os-release", encoding="utf-8") as f:
                    for line in f:
                        if "=" in line:
                            k, v = line.strip().split("=", 1)
                            distro_info[k] = v.strip('"')
            except Exception:
                pass

        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "is_linux": is_linux,
            "distro_name": distro_info.get("PRETTY_NAME", distro_info.get("NAME", "Linux" if is_linux else "Non-Linux")),
            "distro_id": distro_info.get("ID", "unknown"),
        }

    def discover_python(self) -> dict[str, Any]:
        return {
            "available": True,
            "version": platform.python_version(),
            "executable": sys.executable,
        }

    def discover_sipp(self) -> dict[str, Any]:
        candidate_paths = []
        if self.custom_sipp_path:
            candidate_paths.append(self.custom_sipp_path)

        which_sipp = shutil.which("sipp")
        if which_sipp:
            candidate_paths.append(which_sipp)

        candidate_paths.extend(["/usr/local/bin/sipp", "/usr/bin/sipp"])

        for path in candidate_paths:
            if os.path.isfile(path) or shutil.which(path):
                try:
                    res = subprocess.run(
                        [path, "-v"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        timeout=3
                    )
                    ver_str = None
                    for line in res.stdout.splitlines():
                        if "sipp" in line.lower():
                            ver_str = line.strip()
                            break
                    return {
                        "available": True,
                        "path": path,
                        "version": ver_str or "Installed",
                    }
                except Exception:
                    continue

        return {
            "available": False,
            "path": None,
            "version": None,
            "setup_instructions": [
                "SIPp package not found on local Linux path.",
                "Install via package manager: 'sudo apt install -y sipp' (Debian/Ubuntu) or 'sudo dnf install -y sipp' (RHEL/Fedora)."
            ]
        }

    def discover_network(self) -> list[dict[str, Any]]:
        interfaces: list[dict[str, Any]] = []
        if platform.system().lower() == "linux":
            try:
                res = subprocess.run(["ip", "-brief", "addr"], capture_output=True, text=True, timeout=3)
                if res.returncode == 0:
                    for line in res.stdout.splitlines():
                        parts = line.split()
                        if len(parts) >= 3:
                            name = parts[0]
                            ip = parts[2].split("/")[0]
                            interfaces.append({
                                "name": name,
                                "address": ip,
                                "is_loopback": name == "lo"
                            })
            except Exception:
                pass

        if not interfaces:
            try:
                hostname = socket.gethostname()
                _, _, ips = socket.gethostbyname_ex(hostname)
                for ip in ips:
                    interfaces.append({"name": hostname, "address": ip, "is_loopback": ip.startswith("127.")})
            except Exception:
                interfaces.append({"name": "lo", "address": "127.0.0.1", "is_loopback": True})

        return interfaces

    def check_directory_access(self) -> dict[str, Any]:
        cwd = os.getcwd()
        return {
            "working_directory": cwd,
            "can_read": os.access(cwd, os.R_OK),
            "can_write": os.access(cwd, os.W_OK),
        }

    def check_process_capabilities(self) -> dict[str, Any]:
        return {
            "can_spawn": True,
            "pid": os.getpid(),
            "has_kill": shutil.which("kill") is not None,
        }
