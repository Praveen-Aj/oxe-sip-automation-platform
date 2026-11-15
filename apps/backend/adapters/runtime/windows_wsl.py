import shutil
import subprocess
from typing import Any

from apps.backend.adapters.runtime.base import BaseRuntimeAdapter
from shared.schemas.runtime import RuntimeRole, RuntimeType


class WindowsWslRuntimeAdapter(BaseRuntimeAdapter):
    """
    Adapter for discovering and validating Windows Subsystem for Linux (WSL2) environments.
    Reports distribution availability, state, Linux Python, and SIPp binary status inside WSL.
    """

    def __init__(
        self,
        runtime_id: str = "win-wsl2-local",
        name: str = "Local Windows WSL2",
        role: RuntimeRole = RuntimeRole.STANDALONE,
        wsl_distribution: str | None = None
    ):
        super().__init__(runtime_id, name, RuntimeType.WINDOWS_WSL2, role)
        self.wsl_distribution = wsl_distribution

    def _get_wsl_exe(self) -> str | None:
        return shutil.which("wsl") or shutil.which("wsl.exe")

    def detect_os(self) -> dict[str, Any]:
        wsl_exe = self._get_wsl_exe()
        if not wsl_exe:
            return {
                "wsl_installed": False,
                "has_distributions": False,
                "distributions": [],
                "default_distribution": None,
                "message": "WSL binary (wsl.exe) not found on host."
            }

        distributions = []
        default_distro = None
        has_distros = False

        try:
            res = subprocess.run(
                [wsl_exe, "--list", "--verbose"],
                capture_output=True,
                timeout=4
            )
            # Handle potential UTF-16LE encoding from Windows wsl.exe output
            output = ""
            for encoding in ("utf-16le", "utf-8", "latin-1"):
                try:
                    output = res.stdout.decode(encoding)
                    if output and ("NAME" in output or "STATE" in output or "no installed" in output.lower()):
                        break
                except Exception:
                    continue

            for line in output.splitlines():
                line = line.strip()
                if not line or line.startswith("NAME") or "no installed distributions" in line.lower():
                    continue
                # Line format: [*] <name> <state> <version>
                is_default = line.startswith("*")
                clean_line = line.lstrip("* ").strip()
                parts = clean_line.split()
                if parts:
                    name = parts[0]
                    state = parts[1] if len(parts) > 1 else "Unknown"
                    version = parts[2] if len(parts) > 2 else "2"
                    distributions.append({
                        "name": name,
                        "state": state,
                        "version": version,
                        "is_default": is_default
                    })
                    has_distros = True
                    if is_default:
                        default_distro = name
        except Exception as e:
            return {
                "wsl_installed": True,
                "has_distributions": False,
                "distributions": [],
                "default_distribution": None,
                "error": f"Failed to list WSL distributions: {e}"
            }

        selected_distro = self.wsl_distribution or default_distro

        return {
            "wsl_installed": True,
            "has_distributions": has_distros,
            "distributions": distributions,
            "default_distribution": default_distro,
            "selected_distribution": selected_distro,
        }

    def discover_python(self) -> dict[str, Any]:
        wsl_exe = self._get_wsl_exe()
        os_info = self.detect_os()
        distro = os_info.get("selected_distribution")

        if not wsl_exe or not distro:
            return {
                "available": False,
                "reason": "WSL not installed or no distribution selected/registered."
            }

        try:
            cmd = [wsl_exe, "-d", distro, "python3", "--version"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=4)
            if res.returncode == 0:
                return {
                    "available": True,
                    "version": res.stdout.strip(),
                    "distribution": distro
                }
        except Exception as e:
            return {"available": False, "error": str(e)}

        return {"available": False, "distribution": distro}

    def discover_sipp(self) -> dict[str, Any]:
        wsl_exe = self._get_wsl_exe()
        os_info = self.detect_os()
        distro = os_info.get("selected_distribution")

        if not wsl_exe or not os_info.get("has_distributions"):
            return {
                "available": False,
                "path": None,
                "version": None,
                "setup_instructions": [
                    "WSL has no installed Linux distributions on this system.",
                    "To configure a WSL2 runtime for SIPp: Open PowerShell and run: 'wsl --install -d Ubuntu'",
                    "After installation completes, install SIPp in Ubuntu via: 'sudo apt update && sudo apt install -y sipp'",
                ]
            }

        # Check inside target distribution
        try:
            check_sipp = subprocess.run(
                [wsl_exe, "-d", distro, "which", "sipp"],
                capture_output=True,
                text=True,
                timeout=4
            )
            if check_sipp.returncode == 0 and check_sipp.stdout.strip():
                sipp_path = check_sipp.stdout.strip()
                ver_res = subprocess.run(
                    [wsl_exe, "-d", distro, "sipp", "-v"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    timeout=4
                )
                ver_str = None
                for line in ver_res.stdout.splitlines():
                    if "sipp" in line.lower():
                        ver_str = line.strip()
                        break
                return {
                    "available": True,
                    "path": sipp_path,
                    "version": ver_str or "Installed",
                    "distribution": distro
                }
        except Exception as e:
            return {"available": False, "error": str(e)}

        return {
            "available": False,
            "path": None,
            "version": None,
            "distribution": distro,
            "setup_instructions": [
                f"SIPp binary not found inside WSL distribution '{distro}'.",
                f"Install SIPp inside the distribution with: wsl -d {distro} sudo apt update && sudo apt install -y sipp"
            ]
        }

    def discover_network(self) -> list[dict[str, Any]]:
        wsl_exe = self._get_wsl_exe()
        os_info = self.detect_os()
        distro = os_info.get("selected_distribution")
        interfaces = []

        if wsl_exe and distro:
            try:
                cmd = [wsl_exe, "-d", distro, "ip", "-brief", "addr"]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=4)
                for line in res.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 3:
                        name = parts[0]
                        ip = parts[2].split("/")[0]
                        interfaces.append({
                            "name": f"wsl:{name}",
                            "address": ip,
                            "distribution": distro
                        })
            except Exception:
                pass

        if not interfaces:
            interfaces.append({"name": "wsl-unreachable", "address": "none"})

        return interfaces

    def check_directory_access(self) -> dict[str, Any]:
        return {
            "can_read": True,
            "can_write": True,
            "shared_windows_mount": "/mnt/c/ accessible when WSL running"
        }

    def check_process_capabilities(self) -> dict[str, Any]:
        wsl_exe = self._get_wsl_exe()
        return {
            "can_manage_processes": wsl_exe is not None,
            "wsl_executable": wsl_exe,
        }
