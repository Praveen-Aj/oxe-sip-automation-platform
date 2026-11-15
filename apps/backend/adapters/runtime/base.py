from abc import ABC, abstractmethod
from typing import Any

from shared.schemas.runtime import (
    RuntimeDiagnostics,
    RuntimeRole,
    RuntimeType,
    RuntimeValidationResult,
    RuntimeValidationStatus,
)


class BaseRuntimeAdapter(ABC):
    """
    Abstract base adapter for platform execution environments.
    Exposes a consistent contract across Windows, WSL, Linux, and Remote SSH hosts.
    """

    def __init__(self, runtime_id: str, name: str, runtime_type: RuntimeType, role: RuntimeRole = RuntimeRole.STANDALONE):
        self.runtime_id = runtime_id
        self.name = name
        self.runtime_type = runtime_type
        self.role = role

    @abstractmethod
    def detect_os(self) -> dict[str, Any]:
        """Detect underlying operating system, kernel, and platform architecture."""

    @abstractmethod
    def discover_python(self) -> dict[str, Any]:
        """Check for Python interpreter presence and version."""

    @abstractmethod
    def discover_sipp(self) -> dict[str, Any]:
        """Discover SIPp executable location, availability, and version string."""

    @abstractmethod
    def discover_network(self) -> list[dict[str, Any]]:
        """Discover available network interfaces and IP addresses."""

    @abstractmethod
    def check_directory_access(self) -> dict[str, Any]:
        """Verify read/write permissions for scenario and logging directories."""

    @abstractmethod
    def check_process_capabilities(self) -> dict[str, Any]:
        """Verify process management, PID tracking, and signal handling capabilities."""

    def validate(self) -> RuntimeValidationResult:
        """
        Consolidates discovery operations into a structured validation result.
        Must never raise uncaught exceptions or crash the server.
        """
        errors: list[str] = []
        details: list[str] = []
        missing_prereqs: list[str] = []
        setup_instructions: list[str] = []

        try:
            os_info = self.detect_os()
            if os_info.get("error"):
                errors.append(os_info["error"])
            else:
                details.append(f"OS: {os_info.get('system', 'Unknown')} {os_info.get('release', '')} ({os_info.get('machine', '')})")
        except Exception as e:
            os_info = {"error": str(e)}
            errors.append(f"OS detection failed: {e}")

        try:
            py_info = self.discover_python()
            if not py_info.get("available"):
                missing_prereqs.append("Python runtime")
        except Exception as e:
            py_info = {"error": str(e), "available": False}
            errors.append(f"Python check error: {e}")

        try:
            sipp_info = self.discover_sipp()
            sipp_available = bool(sipp_info.get("available"))
            sipp_version = sipp_info.get("version")
            if sipp_available:
                details.append(f"SIPp binary found: {sipp_info.get('path')} (v{sipp_version})")
            else:
                missing_prereqs.append("SIPp executable binary")
                if "setup_instructions" in sipp_info:
                    setup_instructions.extend(sipp_info["setup_instructions"])
        except Exception as e:
            sipp_info = {"error": str(e), "available": False}
            sipp_available = False
            sipp_version = None
            errors.append(f"SIPp discovery error: {e}")

        try:
            net_info = self.discover_network()
        except Exception as e:
            net_info = [{"error": str(e)}]
            errors.append(f"Network discovery error: {e}")

        try:
            dir_info = self.check_directory_access()
            if not dir_info.get("can_write", False):
                errors.append("Directory write permission check failed")
        except Exception as e:
            dir_info = {"error": str(e), "can_write": False}
            errors.append(f"Directory access check error: {e}")

        try:
            proc_info = self.check_process_capabilities()
        except Exception as e:
            proc_info = {"error": str(e)}

        # Determine overall status
        if errors:
            status = RuntimeValidationStatus.ERROR
            can_execute = False
        elif not sipp_available:
            status = RuntimeValidationStatus.UNAVAILABLE
            can_execute = False
        elif missing_prereqs:
            status = RuntimeValidationStatus.WARNING
            can_execute = False
        else:
            status = RuntimeValidationStatus.READY
            can_execute = True

        diagnostics = RuntimeDiagnostics(
            os_info=os_info,
            python_info=py_info,
            sipp_info=sipp_info,
            network_interfaces=net_info,
            directory_access=dir_info,
            process_capabilities=proc_info,
            missing_prerequisites=missing_prereqs,
            setup_instructions=setup_instructions,
        )

        return RuntimeValidationResult(
            runtime_id=self.runtime_id,
            status=status,
            sipp_available=sipp_available,
            sipp_version=sipp_version,
            can_execute=can_execute,
            details=details,
            errors=errors,
            diagnostics=diagnostics,
        )
