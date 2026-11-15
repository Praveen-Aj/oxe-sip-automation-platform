import platform
import uuid
from datetime import datetime
from typing import Any

from apps.backend.adapters.runtime.base import BaseRuntimeAdapter
from apps.backend.adapters.runtime.linux import LinuxRuntimeAdapter
from apps.backend.adapters.runtime.remote_linux import RemoteLinuxRuntimeAdapter
from apps.backend.adapters.runtime.windows import WindowsRuntimeAdapter
from apps.backend.adapters.runtime.windows_wsl import WindowsWslRuntimeAdapter
from apps.backend.core.credentials import CredentialCategory, credential_vault
from apps.backend.core.database import RuntimeModel, SessionLocal
from shared.schemas.runtime import (
    RuntimeCreateRequest,
    RuntimeDiagnostics,
    RuntimeResponse,
    RuntimeRole,
    RuntimeType,
    RuntimeUpdateRequest,
    RuntimeValidationResult,
    RuntimeValidationStatus,
    SippInstallPlanResponse,
    SshAuthConfig,
)


class RuntimeManager:
    """
    Coordinates platform runtime adapters, discovery routines, validation checks,
    and SQLite persistence.
    """

    def __init__(self):
        self._adapters: dict[str, BaseRuntimeAdapter] = {}
        self._initialize_default_adapters()

    def _initialize_default_adapters(self):
        # Always register local OS adapter
        if platform.system().lower() == "windows":
            win_adapter = WindowsRuntimeAdapter(runtime_id="win-native-local", name="Local Windows Host")
            self._adapters[win_adapter.runtime_id] = win_adapter
            wsl_adapter = WindowsWslRuntimeAdapter(runtime_id="win-wsl2-local", name="Local Windows WSL2")
            self._adapters[wsl_adapter.runtime_id] = wsl_adapter
        else:
            linux_adapter = LinuxRuntimeAdapter(runtime_id="linux-native-local", name="Local Linux Host")
            self._adapters[linux_adapter.runtime_id] = linux_adapter

    def _get_adapter_for_model(self, model: RuntimeModel) -> BaseRuntimeAdapter:
        rtype = RuntimeType(model.runtime_type)
        role = RuntimeRole(model.role)

        if rtype == RuntimeType.NATIVE_WINDOWS:
            return WindowsRuntimeAdapter(
                runtime_id=model.id,
                name=model.name,
                role=role,
                custom_sipp_path=model.custom_sipp_path
            )
        elif rtype == RuntimeType.WINDOWS_WSL2:
            return WindowsWslRuntimeAdapter(
                runtime_id=model.id,
                name=model.name,
                role=role,
                wsl_distribution=model.wsl_distribution
            )
        elif rtype == RuntimeType.NATIVE_LINUX:
            return LinuxRuntimeAdapter(
                runtime_id=model.id,
                name=model.name,
                role=role,
                custom_sipp_path=model.custom_sipp_path
            )
        elif rtype == RuntimeType.REMOTE_LINUX:
            ssh_auth = SshAuthConfig(
                auth_method=model.auth_method or "KEY",
                key_path=model.key_path,
                password="***" if model.password_masked else None
            )
            return RemoteLinuxRuntimeAdapter(
                runtime_id=model.id,
                name=model.name,
                hostname=model.hostname,
                port=model.port,
                username=model.username,
                role=role,
                ssh_auth=ssh_auth,
                custom_sipp_path=model.custom_sipp_path,
            )
        else:
            return WindowsRuntimeAdapter(runtime_id=model.id, name=model.name, role=role)

    def discover_local_runtimes(self) -> list[RuntimeResponse]:
        """Automatically scans local machine for Windows, WSL2, or Linux runtimes and syncs DB."""
        results = []
        db = SessionLocal()
        try:
            for runtime_id, adapter in self._adapters.items():
                val = adapter.validate()
                os_info = val.diagnostics.os_info
                os_name = f"{os_info.get('system', 'Unknown')} {os_info.get('release', '')}"

                # Upsert into DB
                model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
                if not model:
                    model = RuntimeModel(
                        id=runtime_id,
                        name=adapter.name,
                        runtime_type=adapter.runtime_type.value,
                        role=adapter.role.value,
                        hostname="127.0.0.1",
                        port=22,
                        status=val.status.value,
                        sipp_available=val.sipp_available,
                        sipp_version=val.sipp_version,
                        operating_system=os_name,
                        last_validated=datetime.utcnow()
                    )
                    model.set_diagnostics(val.diagnostics.model_dump())
                    db.add(model)
                else:
                    model.status = val.status.value
                    model.sipp_available = val.sipp_available
                    model.sipp_version = val.sipp_version
                    model.operating_system = os_name
                    model.last_validated = datetime.utcnow()
                    model.set_diagnostics(val.diagnostics.model_dump())

                db.commit()
                db.refresh(model)

                results.append(self._model_to_response(model))
        finally:
            db.close()

        return results

    def list_runtimes(self) -> list[RuntimeResponse]:
        """List all registered runtimes from the database."""
        db = SessionLocal()
        try:
            models = db.query(RuntimeModel).all()
            if not models:
                # First run: discover local runtimes
                return self.discover_local_runtimes()
            return [self._model_to_response(m) for m in models]
        finally:
            db.close()

    def get_runtime(self, runtime_id: str) -> RuntimeResponse | None:
        db = SessionLocal()
        try:
            model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
            if not model:
                return None
            return self._model_to_response(model)
        finally:
            db.close()

    def add_runtime(self, req: RuntimeCreateRequest) -> RuntimeResponse:
        db = SessionLocal()
        try:
            runtime_id = f"rt-{uuid.uuid4().hex[:8]}"
            password_masked = None
            if req.ssh_auth and req.ssh_auth.password:
                password_masked = "********"
                credential_vault.store_secret(CredentialCategory.SSH, runtime_id, req.ssh_auth.password)
            elif req.ssh_auth and req.ssh_auth.key_path:
                credential_vault.store_secret(CredentialCategory.SSH, f"{runtime_id}:key_path", req.ssh_auth.key_path)

            model = RuntimeModel(
                id=runtime_id,
                name=req.name,
                runtime_type=req.runtime_type.value,
                role=req.role.value,
                hostname=req.hostname,
                port=req.port,
                username=req.username,
                auth_method=req.ssh_auth.auth_method if req.ssh_auth else "KEY",
                key_path=req.ssh_auth.key_path if req.ssh_auth else None,
                password_masked=password_masked,
                wsl_distribution=req.wsl_distribution,
                custom_sipp_path=req.custom_sipp_path,
                status=RuntimeValidationStatus.UNAVAILABLE.value,
                sipp_available=False,
                operating_system="Pending Discovery",
                last_validated=None,
            )
            model.set_diagnostics({})
            db.add(model)
            db.commit()
            db.refresh(model)

            # Perform initial validation
            adapter = self._get_adapter_for_model(model)
            val = adapter.validate()
            os_info = val.diagnostics.os_info
            model.status = val.status.value
            model.sipp_available = val.sipp_available
            model.sipp_version = val.sipp_version
            model.operating_system = f"{os_info.get('system', 'Linux')} {os_info.get('release', '')}"
            model.last_validated = datetime.utcnow()
            model.set_diagnostics(val.diagnostics.model_dump())
            db.commit()
            db.refresh(model)

            return self._model_to_response(model)
        finally:
            db.close()

    def update_runtime(self, runtime_id: str, req: RuntimeUpdateRequest) -> RuntimeResponse | None:
        db = SessionLocal()
        try:
            model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
            if not model:
                return None

            if req.name is not None:
                model.name = req.name
            if req.role is not None:
                model.role = req.role.value
            if req.hostname is not None:
                model.hostname = req.hostname
            if req.port is not None:
                model.port = req.port
            if req.username is not None:
                model.username = req.username
            if req.ssh_auth is not None:
                model.auth_method = req.ssh_auth.auth_method
                model.key_path = req.ssh_auth.key_path
                if req.ssh_auth.password:
                    model.password_masked = "********"
                    credential_vault.store_secret(CredentialCategory.SSH, runtime_id, req.ssh_auth.password)
                if req.ssh_auth.key_path:
                    credential_vault.store_secret(CredentialCategory.SSH, f"{runtime_id}:key_path", req.ssh_auth.key_path)
            if req.wsl_distribution is not None:
                model.wsl_distribution = req.wsl_distribution
            if req.custom_sipp_path is not None:
                model.custom_sipp_path = req.custom_sipp_path

            db.commit()
            db.refresh(model)
            return self._model_to_response(model)
        finally:
            db.close()

    def delete_runtime(self, runtime_id: str) -> bool:
        db = SessionLocal()
        try:
            model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
            if not model:
                return False
            credential_vault.delete_secret(CredentialCategory.SSH, runtime_id)
            credential_vault.delete_secret(CredentialCategory.SSH, f"{runtime_id}:key_path")
            db.delete(model)
            db.commit()
            return True
        finally:
            db.close()

    def test_connection(self, runtime_id: str) -> dict[str, Any] | None:
        db = SessionLocal()
        try:
            model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
            if not model:
                return None
            adapter = self._get_adapter_for_model(model)
            if hasattr(adapter, "execute_connection_tests"):
                return adapter.execute_connection_tests()
            return {
                "local_adapter": True,
                "status": "Ready",
                "message": "Local adapter does not require SSH connection testing",
            }
        finally:
            db.close()

    def get_sipp_install_plan(self, runtime_id: str) -> SippInstallPlanResponse | None:
        db = SessionLocal()
        try:
            model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
            if not model:
                return None
            adapter = self._get_adapter_for_model(model)
            if hasattr(adapter, "get_sipp_install_plan"):
                plan_dict = adapter.get_sipp_install_plan()
                return SippInstallPlanResponse(**plan_dict)
            return SippInstallPlanResponse(
                runtime_id=runtime_id,
                hostname=model.hostname,
                os_name=model.operating_system,
                package_manager="unknown",
                recommended_method="PACKAGE",
                package_commands=["sudo dnf install -y epel-release && sudo dnf install -y sipp"],
                dependencies=["epel-release", "sipp"],
            )
        finally:
            db.close()

    def validate_runtime(self, runtime_id: str) -> RuntimeValidationResult | None:
        db = SessionLocal()
        try:
            model = db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
            if not model:
                return None

            adapter = self._get_adapter_for_model(model)
            val = adapter.validate()

            os_info = val.diagnostics.os_info
            model.status = val.status.value
            model.sipp_available = val.sipp_available
            model.sipp_version = val.sipp_version
            model.operating_system = f"{os_info.get('system', 'Unknown')} {os_info.get('release', '')}"
            model.last_validated = datetime.utcnow()
            model.set_diagnostics(val.diagnostics.model_dump())
            db.commit()

            return val
        finally:
            db.close()

    def _model_to_response(self, model: RuntimeModel) -> RuntimeResponse:
        diag_dict = model.get_diagnostics()
        diagnostics = RuntimeDiagnostics(**diag_dict) if diag_dict else RuntimeDiagnostics()
        return RuntimeResponse(
            id=model.id,
            name=model.name,
            runtime_type=RuntimeType(model.runtime_type),
            role=RuntimeRole(model.role),
            hostname=model.hostname,
            port=model.port,
            username=model.username,
            wsl_distribution=model.wsl_distribution,
            status=RuntimeValidationStatus(model.status),
            sipp_available=model.sipp_available,
            sipp_version=model.sipp_version,
            operating_system=model.operating_system,
            diagnostics=diagnostics,
            last_validated=model.last_validated.isoformat() if model.last_validated else None,
            message="Runtime validated successfully" if model.sipp_available else "SIPp binary unavailable",
        )


_runtime_manager_instance: RuntimeManager | None = None


def get_runtime_manager() -> RuntimeManager:
    global _runtime_manager_instance
    if _runtime_manager_instance is None:
        _runtime_manager_instance = RuntimeManager()
    return _runtime_manager_instance
