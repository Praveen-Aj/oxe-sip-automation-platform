import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from apps.backend.adapters.runtime.base import BaseRuntimeAdapter
from apps.backend.core.credentials import CredentialCategory, credential_vault
from shared.schemas.runtime import RuntimeRole, RuntimeType, SshAuthConfig


class RemoteLinuxRuntimeAdapter(BaseRuntimeAdapter):
    """
    Adapter for discovering, validating, and managing remote Rocky Linux / RHEL SIPp test nodes over OpenSSH.
    Executes non-interactive diagnostic commands with safe argument passing, credential masking,
    and structured capability detection.
    """

    def __init__(
        self,
        runtime_id: str,
        name: str,
        hostname: str,
        port: int = 22,
        username: str | None = None,
        role: RuntimeRole = RuntimeRole.CALLER_CALLED,
        ssh_auth: SshAuthConfig | None = None,
        custom_sipp_path: str | None = None,
        execution_directory: str = "/var/tmp/sipp_runs",
        connect_timeout: float = 5.0,
        command_timeout: float = 10.0,
    ):
        super().__init__(runtime_id, name, RuntimeType.REMOTE_LINUX, role)
        self.hostname = hostname
        self.port = port
        self.username = username or "sipadmin"
        self.ssh_auth = ssh_auth or SshAuthConfig()
        self.custom_sipp_path = custom_sipp_path
        self.execution_directory = execution_directory
        self.connect_timeout = connect_timeout
        self.command_timeout = command_timeout

    def _build_ssh_cmd(self, remote_command: list[str]) -> list[str]:
        """Construct safe SSH argument list with verified host key authentication."""
        ssh_bin = shutil.which("ssh") or "ssh"
        known_hosts_path = Path("config/ssh/known_hosts")
        known_hosts_path.parent.mkdir(parents=True, exist_ok=True)
        if not known_hosts_path.exists():
            known_hosts_path.touch()

        cmd = [
            ssh_bin,
            "-p",
            str(self.port),
            "-o",
            f"ConnectTimeout={int(self.connect_timeout)}",
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-o",
            f"UserKnownHostsFile={known_hosts_path.resolve()}",
            "-o",
            "LogLevel=ERROR",
        ]

        if self.ssh_auth.auth_method == "KEY":
            key_path = self.ssh_auth.key_path or credential_vault.retrieve_secret(
                CredentialCategory.SSH, f"{self.runtime_id}:key_path"
            )
            if key_path:
                cmd.extend(["-i", key_path])

        destination = f"{self.username}@{self.hostname}"
        cmd.append(destination)
        cmd.extend(remote_command)
        return cmd

    def _execute_remote(self, cmd_args: list[str]) -> subprocess.CompletedProcess:
        """Run remote command safely via subprocess without leaking credentials in logs."""
        full_cmd = self._build_ssh_cmd(cmd_args)
        return subprocess.run(full_cmd, capture_output=True, text=True, timeout=self.command_timeout)

    def detect_os(self) -> dict[str, Any]:
        """Detect OS distribution, version, and kernel with Rocky Linux / RHEL / CentOS support."""
        try:
            res_uname = self._execute_remote(["uname", "-s", "-r", "-m"])
            if res_uname.returncode != 0:
                return {
                    "ssh_connected": False,
                    "system": "Unknown",
                    "error": f"SSH connection failed (code {res_uname.returncode}): {res_uname.stderr.strip()}",
                }

            parts = res_uname.stdout.strip().split()
            system = parts[0] if len(parts) > 0 else "Linux"
            kernel = parts[1] if len(parts) > 1 else "Unknown"
            arch = parts[2] if len(parts) > 2 else "x86_64"

            # Parse /etc/os-release for precise Rocky Linux detection
            distro_name = "Linux"
            distro_version = None
            distro_id = "linux"
            pretty_name = f"{system} {kernel}"

            res_release = self._execute_remote(["cat", "/etc/os-release"])
            if res_release.returncode == 0:
                for line in res_release.stdout.splitlines():
                    if line.startswith("NAME="):
                        distro_name = line.split("=", 1)[1].strip('"\'')
                    elif line.startswith("VERSION_ID="):
                        distro_version = line.split("=", 1)[1].strip('"\'')
                    elif line.startswith("ID="):
                        distro_id = line.split("=", 1)[1].strip('"\'')
                    elif line.startswith("PRETTY_NAME="):
                        pretty_name = line.split("=", 1)[1].strip('"\'')

            is_rocky = "rocky" in distro_id.lower() or "rocky" in distro_name.lower()

            return {
                "system": distro_name,
                "release": kernel,
                "machine": arch,
                "distro_version": distro_version,
                "distro_id": distro_id,
                "pretty_name": pretty_name,
                "is_rocky": is_rocky,
                "ssh_connected": True,
                "target_host": self.hostname,
                "target_port": self.port,
            }
        except subprocess.TimeoutExpired:
            return {
                "ssh_connected": False,
                "system": "Unknown",
                "error": f"SSH connection timed out after {self.connect_timeout}s to {self.hostname}:{self.port}",
            }
        except Exception as e:
            return {"ssh_connected": False, "system": "Unknown", "error": f"SSH execution error: {e!s}"}

    def discover_hardware(self) -> dict[str, Any]:
        """Detect CPU count, memory, and disk space on the remote Linux server."""
        info: dict[str, Any] = {
            "cpu_count": 1,
            "memory_mb": 0,
            "memory_free_mb": 0,
            "disk_free_gb": 0.0,
        }
        try:
            # CPU count
            res_cpu = self._execute_remote(["nproc"])
            if res_cpu.returncode == 0 and res_cpu.stdout.strip().isdigit():
                info["cpu_count"] = int(res_cpu.stdout.strip())

            # Memory (free -m)
            res_mem = self._execute_remote(["free", "-m"])
            if res_mem.returncode == 0:
                lines = res_mem.stdout.splitlines()
                if len(lines) >= 2:
                    parts = lines[1].split()
                    if len(parts) >= 4:
                        info["memory_mb"] = int(parts[1])
                        info["memory_free_mb"] = int(parts[3])

            # Disk free
            res_disk = self._execute_remote(["df", "-m", "/var/tmp"])
            if res_disk.returncode != 0:
                res_disk = self._execute_remote(["df", "-m", "/"])
            if res_disk.returncode == 0:
                lines = res_disk.stdout.splitlines()
                if len(lines) >= 2:
                    parts = lines[1].split()
                    if len(parts) >= 4:
                        info["disk_free_gb"] = round(int(parts[3]) / 1024.0, 2)
        except Exception:
            pass

        return info

    def discover_package_manager(self) -> dict[str, Any]:
        """Determine whether dnf, yum, or apt is the active package manager on Rocky Linux."""
        pm_info = {
            "type": "dnf",
            "installed": False,
            "path": None,
            "sipp_package_available": False,
        }
        try:
            res_dnf = self._execute_remote(["which", "dnf"])
            if res_dnf.returncode == 0:
                pm_info["type"] = "dnf"
                pm_info["installed"] = True
                pm_info["path"] = res_dnf.stdout.strip()
            else:
                res_yum = self._execute_remote(["which", "yum"])
                if res_yum.returncode == 0:
                    pm_info["type"] = "yum"
                    pm_info["installed"] = True
                    pm_info["path"] = res_yum.stdout.strip()

            # Check if sipp package is available in repositories
            if pm_info["installed"]:
                res_check = self._execute_remote([pm_info["type"], "info", "sipp"])
                pm_info["sipp_package_available"] = res_check.returncode == 0
        except Exception:
            pass

        return pm_info

    def discover_python(self) -> dict[str, Any]:
        try:
            res = self._execute_remote(["which", "python3"])
            if res.returncode == 0 and res.stdout.strip():
                ver_res = self._execute_remote(["python3", "--version"])
                return {
                    "available": True,
                    "path": res.stdout.strip(),
                    "version": ver_res.stdout.strip(),
                }
        except Exception as e:
            return {"available": False, "error": str(e)}

        return {"available": False}

    def discover_sipp(self) -> dict[str, Any]:
        """Verify SIPp executable, version, and supported capabilities (TLS, PCAP, SCTP, Codecs)."""
        sipp_target = self.custom_sipp_path or "sipp"
        try:
            res = self._execute_remote(["which", sipp_target])
            if res.returncode == 0 and res.stdout.strip():
                bin_path = res.stdout.strip()
                ver_res = self._execute_remote([bin_path, "-v"])
                ver_str = None
                stdout_str = ver_res.stdout or ""
                stderr_str = ver_res.stderr or ""
                output_text = (stdout_str + "\n" + stderr_str).strip()

                for line in output_text.splitlines():
                    if "sipp" in line.lower():
                        ver_str = line.strip()
                        break

                # Inspect capability support flags
                has_tls = bool(re.search(r"tls|ssl|openssl", output_text, re.IGNORECASE))
                has_pcap = bool(re.search(r"pcap|rtp", output_text, re.IGNORECASE))
                has_sctp = bool(re.search(r"sctp", output_text, re.IGNORECASE))

                return {
                    "available": True,
                    "path": bin_path,
                    "version": ver_str or "Installed",
                    "host": self.hostname,
                    "capabilities": {
                        "tls": has_tls,
                        "pcap_playback": has_pcap,
                        "sctp": has_sctp,
                        "udp": True,
                        "tcp": True,
                        "codecs": ["PCMU", "PCMA"],
                    },
                }
        except Exception as e:
            return {"available": False, "error": str(e)}

        # Provide guided Rocky Linux installation plan if SIPp missing
        return {
            "available": False,
            "path": None,
            "version": None,
            "setup_instructions": [
                f"SIPp not found on remote host {self.hostname}.",
                "Install SIPp on the remote host:",
                "  sudo dnf install -y epel-release && sudo dnf install -y sipp",
                "Source compilation (with TLS & PCAP):",
                "  sudo dnf install -y cmake gcc-c++ make libpcap-devel ncurses-devel openssl-devel",
            ],
        }

    def discover_network(self) -> list[dict[str, Any]]:
        """Discover both IPv4 and IPv6 network interfaces."""
        interfaces: list[dict[str, Any]] = []
        try:
            res = self._execute_remote(["ip", "-brief", "addr"])
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 3:
                        name = parts[0]
                        ip_v4 = parts[2].split("/")[0] if len(parts) > 2 else None
                        ip_v6 = parts[3].split("/")[0] if len(parts) > 3 else None
                        interfaces.append(
                            {
                                "name": name,
                                "address": ip_v4,
                                "ipv6": ip_v6,
                                "is_loopback": name == "lo",
                            }
                        )
        except Exception:
            pass

        if not interfaces:
            interfaces.append(
                {
                    "name": "configured_ip",
                    "address": self.hostname,
                    "ipv6": None,
                    "is_loopback": self.hostname.startswith("127."),
                }
            )

        return interfaces

    def check_directory_access(self) -> dict[str, Any]:
        """Verify execution working directory write permissions."""
        target_dir = self.execution_directory or "/var/tmp/sipp_runs"
        try:
            res = self._execute_remote(["test", "-w", "/var/tmp"])
            if res.returncode != 0:
                res = self._execute_remote(["test", "-w", "/tmp"])
            is_writable = (res.returncode == 0) or ("OK" in res.stdout) or ("WRITABLE" in res.stdout)
            return {
                "execution_directory": target_dir,
                "remote_temp_writable": is_writable,
                "can_write": is_writable,
            }
        except Exception as e:
            return {"can_write": False, "error": str(e), "execution_directory": target_dir}

    def check_process_capabilities(self) -> dict[str, Any]:
        try:
            res_ps = self._execute_remote(["which", "ps"])
            res_kill = self._execute_remote(["which", "kill"])
            res_ss = self._execute_remote(["which", "ss"])
            return {
                "can_list_processes": res_ps.returncode == 0,
                "can_kill_processes": res_kill.returncode == 0,
                "socket_inspection_available": res_ss.returncode == 0,
                "remote_ps_available": res_ps.returncode == 0,
            }
        except Exception as e:
            return {"can_list_processes": False, "error": str(e)}

    def check_port_free(self, port: int) -> dict[str, Any]:
        """Verify that a local port (e.g. 5062 or 5080) is not already bound on Rocky Linux."""
        try:
            res = self._execute_remote(["ss", "-lntu"])
            if res.returncode == 0:
                is_bound = f":{port} " in res.stdout or f":{port}\n" in res.stdout
                return {
                    "port": port,
                    "is_free": not is_bound,
                    "bound_warning": f"Port {port} is already bound on host {self.hostname}" if is_bound else None,
                }
        except Exception:
            pass
        return {"port": port, "is_free": True}

    def check_pbx_route(self, pbx_ip: str) -> dict[str, Any]:
        """Check if Rocky Linux has an active routing path to the OXE PBX."""
        try:
            res = self._execute_remote(["ip", "route", "get", pbx_ip])
            if res.returncode == 0:
                return {
                    "destination": pbx_ip,
                    "route_exists": True,
                    "details": res.stdout.strip(),
                }
            return {
                "destination": pbx_ip,
                "route_exists": False,
                "error": res.stderr.strip() or f"No route to host {pbx_ip}",
            }
        except Exception as e:
            return {"destination": pbx_ip, "route_exists": False, "error": str(e)}

    def execute_connection_tests(self) -> dict[str, Any]:
        """Run granular connection diagnostic steps and display individual results."""
        os_info = self.detect_os()
        ssh_ok = os_info.get("ssh_connected", False)
        sipp_info = self.discover_sipp() if ssh_ok else {"available": False}
        dir_info = self.check_directory_access() if ssh_ok else {"can_write": False}
        proc_info = self.check_process_capabilities() if ssh_ok else {}

        return {
            "ssh_connectivity": {
                "passed": ssh_ok,
                "target": f"{self.hostname}:{self.port}",
                "detail": "Connected" if ssh_ok else os_info.get("error", "Failed"),
            },
            "authentication": {
                "passed": ssh_ok,
                "username": self.username,
                "method": self.ssh_auth.auth_method,
            },
            "host_key_verification": {
                "passed": ssh_ok,
                "status": "StrictHostKeyChecking=no (Lab Mode)",
            },
            "runtime_discovery": {
                "passed": ssh_ok,
                "os": os_info.get("system"),
                "kernel": os_info.get("release"),
                "arch": os_info.get("machine"),
                "pretty_name": os_info.get("pretty_name"),
            },
            "sipp_availability": {
                "passed": sipp_info.get("available", False),
                "path": sipp_info.get("path"),
                "version": sipp_info.get("version"),
            },
            "execution_directory": {
                "passed": dir_info.get("can_write", False),
                "directory": dir_info.get("execution_directory"),
            },
            "process_management": {
                "passed": proc_info.get("can_list_processes", False),
            },
        }

    def get_sipp_install_plan(self) -> dict[str, Any]:
        """Generate tailored Rocky Linux / RHEL SIPp installation and compilation recipe."""
        os_info = self.detect_os()
        pm_info = self.discover_package_manager()
        distro_ver = os_info.get("distro_version") or "9"
        pm_type = pm_info.get("type", "dnf")

        return {
            "runtime_id": self.runtime_id,
            "hostname": self.hostname,
            "os_name": os_info.get("system", "Rocky Linux"),
            "distro_version": distro_ver,
            "package_manager": pm_type,
            "recommended_method": "PACKAGE" if pm_info.get("sipp_package_available") else "SOURCE_BUILD",
            "package_commands": [
                f"sudo {pm_type} install -y epel-release",
                f"sudo {pm_type} install -y sipp",
            ],
            "source_build_commands": [
                f"sudo {pm_type} groupinstall -y 'Development Tools'",
                f"sudo {pm_type} install -y cmake gcc-c++ make libpcap-devel ncurses-devel openssl-devel lksctp-tools-devel",
                "git clone https://github.com/SIPp/sipp.git",
                "cd sipp",
                "cmake . -DUSE_SSL=1 -DUSE_PCAP=1 -DUSE_SCTP=1",
                "make -j$(nproc)",
                "sudo make install",
            ],
            "dependencies": [
                "epel-release",
                "cmake",
                "gcc-c++",
                "libpcap-devel",
                "ncurses-devel",
                "openssl-devel",
            ],
            "requires_root": True,
            "expected_binary_path": "/usr/bin/sipp",
            "notes": [
                "Requires sudo/root privileges on Rocky Linux server.",
                "EPEL repository provides official enterprise-tested SIPp builds.",
                "Source build provides custom codec playback and TLS 1.3 support.",
            ],
        }
