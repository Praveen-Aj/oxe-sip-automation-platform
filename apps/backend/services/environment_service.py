import uuid
from datetime import datetime
from typing import Any

from apps.backend.adapters.runtime.manager import get_runtime_manager
from apps.backend.core.database import EnvironmentModel, SessionLocal
from shared.schemas.environment import (
    EnvironmentCreateRequest,
    EnvironmentProfileExport,
    EnvironmentResponse,
    EnvironmentType,
    EnvironmentUpdateRequest,
    EnvironmentValidationResult,
    EnvironmentValidationStatus,
    SipTransport,
)


class EnvironmentManager:
    """
    Manages test environments, PBX parameters, CALLER and CALLED runtime associations,
    single-host port conflict validation, and profile export/import.
    """

    def __init__(self):
        self._ensure_default_environments()

    def _ensure_default_environments(self):
        """Seed demo, lab, and Rocky Linux environments if database is empty."""
        db = SessionLocal()
        try:
            count = db.query(EnvironmentModel).count()
            if count == 0:
                # 1. Local Simulated Demo Environment
                demo_env = EnvironmentModel(
                    id="env-local-simulation",
                    name="Local Windows Simulation (Demo)",
                    environment_type=EnvironmentType.SIMULATION.value,
                    lab_designation="SIM-LOCAL-01",
                    description="In-memory software prototype with virtual loopback signaling.",
                    pbx_host="127.0.0.1",
                    pbx_port=5060,
                    pbx_domain="local.test",
                    trunk_group=1,
                    caller_runtime_id="win-native-local",
                    caller_host="127.0.0.1",
                    caller_port=5062,
                    caller_interface="loopback",
                    called_runtime_id="win-native-local",
                    called_host="127.0.0.1",
                    called_port=5080,
                    called_interface="loopback",
                    sip_transport="UDP",
                    network_interface="loopback",
                    is_demo=True,
                    is_active=True,
                    status=EnvironmentValidationStatus.VALID.value,
                )
                demo_env.set_validation_details(
                    {
                        "summary": "Demonstration environment initialized for local development.",
                        "caller_ready": True,
                        "called_ready": True,
                        "pbx_ready": True,
                    }
                )
                db.add(demo_env)

                # 2. Hardware Lab OXE Template (Rocky Linux Single-Host Execution)
                lab_env = EnvironmentModel(
                    id="env-lab-oxe-rocky",
                    name="OXE Lab - Rocky Linux Execution Host",
                    environment_type=EnvironmentType.LAB.value,
                    lab_designation="OXE-LAB-ROCKY-01",
                    description="Lab environment with single Rocky Linux host running both CALLER (5062) and CALLED (5080) against lab OXE.",
                    pbx_host="172.19.112.51",
                    pbx_port=5060,
                    pbx_domain="oxe.alcatel-lucent.enterprise",
                    trunk_group=4,
                    caller_runtime_id=None,
                    caller_host="172.19.112.50",
                    caller_port=5062,
                    caller_interface="eth0",
                    called_runtime_id=None,
                    called_host="172.19.112.50",
                    called_port=5080,
                    called_interface="eth0",
                    sip_transport="UDP",
                    network_interface="eth0",
                    is_demo=False,
                    is_active=False,
                    status=EnvironmentValidationStatus.UNVALIDATED.value,
                )
                lab_env.set_validation_details(
                    {
                        "summary": "Pending remote Rocky Linux test host SSH association for CALLER and CALLED.",
                        "caller_ready": False,
                        "called_ready": False,
                        "pbx_ready": True,
                    }
                )
                db.add(lab_env)

                db.commit()
        finally:
            db.close()

    def list_environments(self) -> list[EnvironmentResponse]:
        db = SessionLocal()
        try:
            models = db.query(EnvironmentModel).order_by(EnvironmentModel.created_at.asc()).all()
            return [self._model_to_response(m) for m in models]
        finally:
            db.close()

    def get_environment(self, env_id: str) -> EnvironmentResponse | None:
        db = SessionLocal()
        try:
            model = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not model:
                return None
            return self._model_to_response(model)
        finally:
            db.close()

    def create_environment(self, req: EnvironmentCreateRequest) -> EnvironmentResponse:
        db = SessionLocal()
        try:
            env_id = f"env-{uuid.uuid4().hex[:8]}"
            model = EnvironmentModel(
                id=env_id,
                name=req.name,
                environment_type=req.environment_type.value,
                lab_designation=req.lab_designation or "OXE-LAB",
                description=req.description,
                pbx_host=req.pbx_host,
                pbx_port=req.pbx_port,
                pbx_domain=req.pbx_domain,
                trunk_group=req.trunk_group,
                caller_runtime_id=req.caller_runtime_id,
                caller_host=req.caller_host,
                caller_port=req.caller_port,
                caller_interface=req.caller_interface or "eth0",
                called_runtime_id=req.called_runtime_id,
                called_host=req.called_host,
                called_port=req.called_port,
                called_interface=req.called_interface or "eth0",
                sip_transport=req.sip_transport.value,
                network_interface=req.network_interface or "eth0",
                is_demo=req.is_demo,
                is_active=False,
                status=EnvironmentValidationStatus.UNVALIDATED.value,
            )
            model.set_validation_details({})
            db.add(model)
            db.commit()
            db.refresh(model)

            # Validate newly created environment
            self._validate_model(model, db)
            db.commit()
            db.refresh(model)

            return self._model_to_response(model)
        finally:
            db.close()

    def update_environment(self, env_id: str, req: EnvironmentUpdateRequest) -> EnvironmentResponse | None:
        db = SessionLocal()
        try:
            model = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not model:
                return None

            if req.name is not None:
                model.name = req.name
            if req.environment_type is not None:
                model.environment_type = req.environment_type.value
            if req.lab_designation is not None:
                model.lab_designation = req.lab_designation
            if req.description is not None:
                model.description = req.description
            if req.pbx_host is not None:
                model.pbx_host = req.pbx_host
            if req.pbx_port is not None:
                model.pbx_port = req.pbx_port
            if req.pbx_domain is not None:
                model.pbx_domain = req.pbx_domain
            if req.trunk_group is not None:
                model.trunk_group = req.trunk_group
            if req.caller_runtime_id is not None:
                model.caller_runtime_id = req.caller_runtime_id
            if req.caller_host is not None:
                model.caller_host = req.caller_host
            if req.caller_port is not None:
                model.caller_port = req.caller_port
            if req.caller_interface is not None:
                model.caller_interface = req.caller_interface
            if req.called_runtime_id is not None:
                model.called_runtime_id = req.called_runtime_id
            if req.called_host is not None:
                model.called_host = req.called_host
            if req.called_port is not None:
                model.called_port = req.called_port
            if req.called_interface is not None:
                model.called_interface = req.called_interface
            if req.sip_transport is not None:
                model.sip_transport = req.sip_transport.value
            if req.network_interface is not None:
                model.network_interface = req.network_interface
            if req.is_demo is not None:
                model.is_demo = req.is_demo

            self._validate_model(model, db)
            db.commit()
            db.refresh(model)
            return self._model_to_response(model)
        finally:
            db.close()

    def delete_environment(self, env_id: str) -> bool:
        db = SessionLocal()
        try:
            model = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not model:
                return False
            db.delete(model)
            db.commit()
            return True
        finally:
            db.close()

    def duplicate_environment(self, env_id: str) -> EnvironmentResponse | None:
        """Create a full clone of an environment profile with a new ID."""
        db = SessionLocal()
        try:
            original = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not original:
                return None

            clone = EnvironmentModel(
                id=f"env-{uuid.uuid4().hex[:8]}",
                name=f"{original.name} (Copy)",
                environment_type=original.environment_type,
                lab_designation=original.lab_designation,
                description=f"Cloned from {original.name}",
                pbx_host=original.pbx_host,
                pbx_port=original.pbx_port,
                pbx_domain=original.pbx_domain,
                trunk_group=original.trunk_group,
                caller_runtime_id=original.caller_runtime_id,
                caller_host=original.caller_host,
                caller_port=original.caller_port,
                caller_interface=original.caller_interface,
                called_runtime_id=original.called_runtime_id,
                called_host=original.called_host,
                called_port=original.called_port,
                called_interface=original.called_interface,
                sip_transport=original.sip_transport,
                network_interface=original.network_interface,
                is_demo=original.is_demo,
                is_active=False,
                status=EnvironmentValidationStatus.UNVALIDATED.value,
            )
            clone.set_validation_details(original.get_validation_details())
            db.add(clone)
            db.commit()
            db.refresh(clone)
            return self._model_to_response(clone)
        finally:
            db.close()

    def activate_environment(self, env_id: str) -> EnvironmentResponse | None:
        """Sets target environment as the globally active deployment target."""
        db = SessionLocal()
        try:
            target = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not target:
                return None

            # Mark all others as inactive
            db.query(EnvironmentModel).update({EnvironmentModel.is_active: False})
            target.is_active = True
            db.commit()
            db.refresh(target)
            return self._model_to_response(target)
        finally:
            db.close()

    set_active_environment = activate_environment

    def export_profile(self, env_id: str) -> EnvironmentProfileExport | None:
        """Export reusable environment profile without any secrets or credentials."""
        db = SessionLocal()
        try:
            model = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not model:
                return None

            return EnvironmentProfileExport(
                environment_name=model.name,
                environment_type=EnvironmentType(model.environment_type or "LAB"),
                lab_designation=model.lab_designation,
                description=model.description,
                pbx={
                    "host": model.pbx_host,
                    "sip_port": model.pbx_port,
                    "domain": model.pbx_domain,
                    "trunk_group": model.trunk_group,
                },
                caller={
                    "runtime_id": model.caller_runtime_id,
                    "host": model.caller_host,
                    "local_port": model.caller_port,
                    "interface": model.caller_interface or "eth0",
                    "role": "UAC",
                },
                called={
                    "runtime_id": model.called_runtime_id,
                    "host": model.called_host,
                    "local_port": model.called_port,
                    "interface": model.called_interface or "eth0",
                    "role": "UAS",
                },
                transport=SipTransport(model.sip_transport),
                exported_at=datetime.utcnow().isoformat(),
            )
        finally:
            db.close()

    def import_profile(self, profile: dict) -> EnvironmentResponse:
        """Import environment configuration from JSON profile."""
        req = EnvironmentCreateRequest(
            name=profile.get("environment_name", "Imported Lab Profile"),
            environment_type=EnvironmentType(profile.get("environment_type", "LAB")),
            lab_designation=profile.get("lab_designation", "LAB-IMPORT"),
            description=profile.get("description", "Imported configuration profile"),
            pbx_host=profile.get("pbx", {}).get("host") or profile.get("pbx_host") or "127.0.0.1",
            pbx_port=profile.get("pbx", {}).get("sip_port", 5060),
            pbx_domain=profile.get("pbx", {}).get("domain", "oxe.enterprise"),
            trunk_group=profile.get("pbx", {}).get("trunk_group", 4),
            caller_runtime_id=profile.get("caller", {}).get("runtime_id"),
            caller_host=profile.get("caller", {}).get("host") or profile.get("caller_host") or "127.0.0.1",
            caller_port=profile.get("caller", {}).get("local_port", 5062),
            caller_interface=profile.get("caller", {}).get("interface", "eth0"),
            called_runtime_id=profile.get("called", {}).get("runtime_id"),
            called_host=profile.get("called", {}).get("host") or profile.get("called_host") or "127.0.0.1",
            called_port=profile.get("called", {}).get("local_port", 5080),
            called_interface=profile.get("called", {}).get("interface", "eth0"),
            sip_transport=SipTransport(profile.get("transport", "UDP")),
        )
        return self.create_environment(req)

    def validate_environment(self, env_id: str) -> EnvironmentValidationResult | None:
        db = SessionLocal()
        try:
            model = db.query(EnvironmentModel).filter(EnvironmentModel.id == env_id).first()
            if not model:
                return None
            return self._validate_model(model, db)
        finally:
            db.close()

    def _validate_model(self, model: EnvironmentModel, db) -> EnvironmentValidationResult:
        rt_mgr = get_runtime_manager()
        errors: list[str] = []
        warnings: list[str] = []
        checks: list[dict[str, Any]] = []

        # 1. PBX Syntax & Port Validation
        pbx_ready = bool(model.pbx_host and 1 <= model.pbx_port <= 65535)
        if not pbx_ready:
            errors.append(f"Invalid PBX configuration: {model.pbx_host}:{model.pbx_port}")

        checks.append(
            {
                "name": "PBX Configuration",
                "passed": pbx_ready,
                "details": f"Target OXE IP {model.pbx_host}:{model.pbx_port} (Trunk Group {model.trunk_group})",
            }
        )

        # 2. Single-Host Port Conflict Validation
        # If CALLER and CALLED use the same runtime or same host IP, their listening ports must not collide
        same_runtime = (
            model.caller_runtime_id
            and model.called_runtime_id
            and model.caller_runtime_id == model.called_runtime_id
        )
        same_host = model.caller_host == model.called_host
        is_single_host = same_runtime or same_host

        port_conflict = False
        if is_single_host and model.caller_port == model.called_port:
            port_conflict = True
            msg = (
                f"Port Conflict Error: CALLER and CALLED share execution host '{model.caller_host}' "
                f"but both are configured to bind port {model.caller_port}. Distinct local listening ports "
                f"(e.g. CALLER {model.caller_port}, CALLED {model.caller_port + 20}) are required to prevent socket collision."
            )
            errors.append(msg)
            checks.append(
                {
                    "name": "Single-Host Port Collision Check",
                    "passed": False,
                    "details": msg,
                }
            )
        else:
            checks.append(
                {
                    "name": "Single-Host Port Allocation",
                    "passed": True,
                    "details": f"CALLER Port: {model.caller_port}, CALLED Port: {model.called_port} (Isolated)",
                }
            )

        # 3. CALLER Host & Runtime Validation
        caller_ready = False
        if model.caller_runtime_id:
            caller_rt = rt_mgr.get_runtime(model.caller_runtime_id)
            if caller_rt:
                if caller_rt.sipp_available:
                    caller_ready = True
                    checks.append(
                        {
                            "name": "CALLER Runtime Ready",
                            "passed": True,
                            "details": f"Runtime '{caller_rt.name}' ({caller_rt.hostname}) has SIPp {caller_rt.sipp_version}",
                        }
                    )
                else:
                    warnings.append(f"CALLER runtime '{caller_rt.name}' does not have a functional SIPp binary.")
                    checks.append(
                        {
                            "name": "CALLER Runtime Incomplete",
                            "passed": False,
                            "details": f"Runtime '{caller_rt.name}' is registered but missing SIPp binary.",
                        }
                    )
            else:
                errors.append(f"Associated CALLER runtime ID '{model.caller_runtime_id}' not found in runtime registry.")
        else:
            warnings.append("No dedicated runtime associated with CALLER endpoint.")
            checks.append(
                {
                    "name": "CALLER Runtime Association",
                    "passed": False,
                    "details": f"Using host '{model.caller_host}' without active runtime manager validation.",
                }
            )

        # 4. CALLED Host & Runtime Validation
        called_ready = False
        if model.called_runtime_id:
            called_rt = rt_mgr.get_runtime(model.called_runtime_id)
            if called_rt:
                if called_rt.sipp_available:
                    called_ready = True
                    checks.append(
                        {
                            "name": "CALLED Runtime Ready",
                            "passed": True,
                            "details": f"Runtime '{called_rt.name}' ({called_rt.hostname}) has SIPp {called_rt.sipp_version}",
                        }
                    )
                else:
                    warnings.append(f"CALLED runtime '{called_rt.name}' does not have a functional SIPp binary.")
                    checks.append(
                        {
                            "name": "CALLED Runtime Incomplete",
                            "passed": False,
                            "details": f"Runtime '{called_rt.name}' is registered but missing SIPp binary.",
                        }
                    )
            else:
                errors.append(f"Associated CALLED runtime ID '{model.called_runtime_id}' not found in runtime registry.")
        else:
            warnings.append("No dedicated runtime associated with CALLED endpoint.")
            checks.append(
                {
                    "name": "CALLED Runtime Association",
                    "passed": False,
                    "details": f"Using host '{model.called_host}' without active runtime manager validation.",
                }
            )

        # Determine overall readiness
        if errors or port_conflict:
            status = EnvironmentValidationStatus.INVALID
        elif not caller_ready or not called_ready:
            status = EnvironmentValidationStatus.WARNING
        else:
            status = EnvironmentValidationStatus.VALID

        model.status = status.value
        model.set_validation_details(
            {
                "summary": "Validation executed successfully",
                "caller_ready": caller_ready,
                "called_ready": called_ready,
                "pbx_ready": pbx_ready,
                "port_conflict": port_conflict,
                "is_single_host": is_single_host,
                "checked_at": datetime.utcnow().isoformat(),
            }
        )
        db.commit()

        return EnvironmentValidationResult(
            environment_id=model.id,
            overall_status=status,
            caller_ready=caller_ready,
            called_ready=called_ready,
            pbx_reachable=pbx_ready,
            checks=checks,
            errors=errors,
            warnings=warnings,
        )

    def _model_to_response(self, model: EnvironmentModel) -> EnvironmentResponse:
        v_details = model.get_validation_details()
        is_conflict = v_details.get("port_conflict", False) or (
            model.caller_host == model.called_host and model.caller_port == model.called_port
        )
        conflict_msg = (
            f"Port collision detected: Both CALLER and CALLED are set to port {model.caller_port} on {model.caller_host}."
            if is_conflict
            else None
        )

        return EnvironmentResponse(
            id=model.id,
            name=model.name,
            environment_type=EnvironmentType(model.environment_type or "LAB"),
            lab_designation=model.lab_designation or "OXE-LAB",
            description=model.description,
            pbx_host=model.pbx_host,
            pbx_port=model.pbx_port,
            pbx_domain=model.pbx_domain,
            trunk_group=model.trunk_group,
            caller_runtime_id=model.caller_runtime_id,
            caller_host=model.caller_host,
            caller_port=model.caller_port,
            caller_interface=model.caller_interface or "eth0",
            called_runtime_id=model.called_runtime_id,
            called_host=model.called_host,
            called_port=model.called_port,
            called_interface=model.called_interface or "eth0",
            sip_transport=SipTransport(model.sip_transport),
            network_interface=model.network_interface or "eth0",
            is_demo=model.is_demo,
            is_active=model.is_active,
            status=EnvironmentValidationStatus(model.status),
            validation_details=v_details,
            port_conflict=is_conflict,
            port_conflict_message=conflict_msg,
            created_at=model.created_at.isoformat() if model.created_at else "",
            updated_at=model.updated_at.isoformat() if model.updated_at else "",
        )


_env_manager_instance: EnvironmentManager | None = None


def get_environment_manager() -> EnvironmentManager:
    global _env_manager_instance
    if _env_manager_instance is None:
        _env_manager_instance = EnvironmentManager()
    return _env_manager_instance
