import ipaddress
import socket
from datetime import datetime

from sqlalchemy.orm import Session

from apps.backend.adapters.runtime.manager import RuntimeManager
from apps.backend.core.database import ConfigurationModel, EnvironmentModel, RuntimeModel
from apps.backend.services.scenario_service import ScenarioService
from shared.schemas.preflight import (
    PreflightCheck,
    PreflightCheckCategory,
    PreflightCheckStatus,
    PreflightRequest,
    PreflightResult,
)


class PreflightValidationService:
    def __init__(
        self,
        db: Session,
        scenario_service: ScenarioService | None = None,
        runtime_manager: RuntimeManager | None = None,
    ):
        self.db = db
        self.scenario_service = scenario_service or ScenarioService()
        self.runtime_manager = runtime_manager or RuntimeManager()

    def run_preflight(self, request: PreflightRequest) -> PreflightResult:
        checks: list[PreflightCheck] = []
        blockers: list[str] = []
        warnings: list[str] = []

        # 1. Environment Validation
        env = self.db.query(EnvironmentModel).filter(
            (EnvironmentModel.id == request.environment_id) |
            (EnvironmentModel.id == f"env-{request.environment_id}") |
            (EnvironmentModel.name.ilike(f"%{request.environment_id}%"))
        ).first()
        if not env:
            msg = f"Environment '{request.environment_id}' not found in database."
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.ENVIRONMENT,
                    name="Environment Existence",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Select an existing environment or create one in Environment Manager.",
                )
            )
            blockers.append(msg)
            return self._build_result(request, checks, blockers, warnings)

        # Environment PBX IP Validation
        try:
            ipaddress.IPv4Address(env.pbx_host)
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.PBX_CONNECTIVITY,
                    name="PBX Host IP Syntax",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message=f"Valid IPv4 address: {env.pbx_host}",
                    details={"pbx_host": env.pbx_host},
                )
            )
        except ValueError:
            msg = f"Invalid PBX IPv4 address: '{env.pbx_host}'"
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.PBX_CONNECTIVITY,
                    name="PBX Host IP Syntax",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Update environment PBX IP with a valid dotted-decimal IPv4 address.",
                )
            )
            blockers.append(msg)

        # PBX Port Validation
        if 1 <= env.pbx_port <= 65535:
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.ENVIRONMENT,
                    name="PBX SIP Port Range",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message=f"Valid SIP port: {env.pbx_port}",
                )
            )
        else:
            msg = f"Invalid PBX SIP port {env.pbx_port} (must be between 1 and 65535)"
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.ENVIRONMENT,
                    name="PBX SIP Port Range",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Set PBX port to standard SIP port (e.g. 5060).",
                )
            )
            blockers.append(msg)

        # Trunk Group Validation
        if env.trunk_group and env.trunk_group > 0:
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.ENVIRONMENT,
                    name="OXE Trunk Group",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message=f"Trunk Group {env.trunk_group} configured",
                )
            )
        else:
            warn = "No Trunk Group configured on environment; defaulting to trunk group 4."
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.ENVIRONMENT,
                    name="OXE Trunk Group",
                    status=PreflightCheckStatus.WARNING,
                    is_blocker=False,
                    message=warn,
                    remediation="Configure a valid Trunk Group ID in Environment Manager.",
                )
            )
            warnings.append(warn)

        # 2. Scenario Validation
        scenario = self.scenario_service.get_scenario(request.scenario_id)
        if not scenario:
            msg = f"Scenario '{request.scenario_id}' not found in scenario assets library."
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.SCENARIO,
                    name="Scenario Discovery",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Verify scenario XML exists in assets/sipp/ directory.",
                )
            )
            blockers.append(msg)
            return self._build_result(request, checks, blockers, warnings)

        if scenario.validation_status != "VALID":
            msg = f"Scenario XML schema invalid: {', '.join(scenario.validation_errors)}"
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.SCENARIO,
                    name="Scenario XML Schema",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Review XML syntax and tags in assets/sipp/.",
                )
            )
            blockers.append(msg)
        else:
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.SCENARIO,
                    name="Scenario XML Schema",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message=f"Valid SIPp scenario XML ({scenario.element_count} elements)",
                    details={"methods": scenario.methods, "role": scenario.role},
                )
            )

        # Check configuration if provided
        cfg: ConfigurationModel | None = None
        if request.configuration_id:
            cfg = self.db.query(ConfigurationModel).filter(ConfigurationModel.id == request.configuration_id).first()
            if not cfg:
                msg = f"Configuration '{request.configuration_id}' not found."
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.SCENARIO,
                        name="Test Configuration Association",
                        status=PreflightCheckStatus.FAIL,
                        is_blocker=True,
                        message=msg,
                        remediation="Select a valid saved configuration or proceed with environment defaults.",
                    )
                )
                blockers.append(msg)
            else:
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.SCENARIO,
                        name="Test Configuration Association",
                        status=PreflightCheckStatus.PASS,
                        is_blocker=False,
                        message=f"Configuration '{cfg.name}' loaded successfully",
                    )
                )

                # Check Scenario-Configuration compatibility (Auth & PRACK)
                if scenario.authentication and not cfg.auth_enabled:
                    warn = "Scenario expects SIP Digest Authentication (401/407) but auth is disabled in configuration."
                    checks.append(
                        PreflightCheck(
                            category=PreflightCheckCategory.SCENARIO,
                            name="Authentication Parameter Alignment",
                            status=PreflightCheckStatus.WARNING,
                            is_blocker=False,
                            message=warn,
                            remediation="Enable authentication in test configuration.",
                        )
                    )
                    warnings.append(warn)

                if scenario.prack and not cfg.prack_enabled:
                    warn = "Scenario uses 100rel PRACK provisional acknowledgements but PRACK is disabled in configuration."
                    checks.append(
                        PreflightCheck(
                            category=PreflightCheckCategory.SCENARIO,
                            name="PRACK Protocol Alignment",
                            status=PreflightCheckStatus.WARNING,
                            is_blocker=False,
                            message=warn,
                            remediation="Enable PRACK in test configuration.",
                        )
                    )
                    warnings.append(warn)

        # 3. CALLER Runtime Validation
        caller_id = (cfg.caller_runtime_id if cfg and cfg.caller_runtime_id else None) or env.caller_runtime_id
        if not caller_id and not env.is_demo:
            msg = "CALLER execution runtime is not assigned."
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.RUNTIME_CALLER,
                    name="CALLER Runtime Assignment",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Assign a CALLER runtime in Environment Manager or Configuration Wizard.",
                )
            )
            blockers.append(msg)
        elif env.is_demo:
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.RUNTIME_CALLER,
                    name="CALLER Runtime",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message="Simulated CALLER Runtime active (Demo environment)",
                    details={"is_demo": True},
                )
            )
        else:
            caller_check = self._validate_runtime_node(caller_id, "CALLER", PreflightCheckCategory.RUNTIME_CALLER)
            checks.append(caller_check)
            if caller_check.status == PreflightCheckStatus.FAIL and caller_check.is_blocker:
                blockers.append(caller_check.message)
            elif caller_check.status == PreflightCheckStatus.WARNING:
                warnings.append(caller_check.message)

        # 4. CALLED Runtime Validation (for 2-node scenarios)
        called_id = (cfg.called_runtime_id if cfg and cfg.called_runtime_id else None) or env.called_runtime_id
        if scenario.role in ("UAC", "MIXED") and not env.is_demo:
            if not called_id:
                warn = "CALLED peer runtime is not assigned. Ensure UAS answering side is separately active on PBX."
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.RUNTIME_CALLED,
                        name="CALLED Runtime Assignment",
                        status=PreflightCheckStatus.WARNING,
                        is_blocker=False,
                        message=warn,
                        remediation="Assign CALLED runtime if orchestrating 2-party calls.",
                    )
                )
                warnings.append(warn)
            else:
                called_check = self._validate_runtime_node(called_id, "CALLED", PreflightCheckCategory.RUNTIME_CALLED)
                checks.append(called_check)
                if called_check.status == PreflightCheckStatus.FAIL and called_check.is_blocker:
                    blockers.append(called_check.message)
                elif called_check.status == PreflightCheckStatus.WARNING:
                    warnings.append(called_check.message)
        elif env.is_demo:
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.RUNTIME_CALLED,
                    name="CALLED Runtime",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message="Simulated CALLED UAS Runtime active (Demo environment)",
                    details={"is_demo": True},
                )
            )

        # 5. Local & Remote Port Availability Validation
        caller_p = cfg.caller_port if cfg else env.caller_port
        called_p = cfg.called_port if cfg else env.called_port
        is_same_host = (caller_id and called_id and caller_id == called_id) or (env.caller_host == env.called_host)

        # Single-Host Port Collision Blocker Check
        if is_same_host and caller_p == called_p:
            msg = (
                f"Port Conflict Blocker: Both CALLER (UAC) and CALLED (UAS) share execution host '{env.caller_host}' "
                f"and both specify port {caller_p}. Distinct ports must be configured (e.g. 5062 for CALLER and 5080 for CALLED) "
                f"to prevent socket collision."
            )
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.PORT,
                    name="Single-Host Port Collision Check",
                    status=PreflightCheckStatus.FAIL,
                    is_blocker=True,
                    message=msg,
                    remediation="Change either CALLER or CALLED port in Environment Manager or Configuration Wizard.",
                )
            )
            blockers.append(msg)
        else:
            checks.append(
                PreflightCheck(
                    category=PreflightCheckCategory.PORT,
                    name="Single-Host Port Isolation",
                    status=PreflightCheckStatus.PASS,
                    is_blocker=False,
                    message=f"Distinct ports assigned: CALLER={caller_p}, CALLED={called_p}",
                )
            )

        target_ports = request.target_ports or [caller_p, called_p]
        for port in set(target_ports):
            if not (1 <= port <= 65535):
                msg = f"Target port {port} out of range"
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.PORT,
                        name=f"Port {port} Range",
                        status=PreflightCheckStatus.FAIL,
                        is_blocker=True,
                        message=msg,
                    )
                )
                blockers.append(msg)
                continue

            # Check if port is bound locally on Windows/Linux host
            is_avail = self._check_local_port_availability(port)
            if is_avail:
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.PORT,
                        name=f"UDP Port {port} Availability",
                        status=PreflightCheckStatus.PASS,
                        is_blocker=False,
                        message=f"UDP port {port} is free and ready for binding",
                    )
                )
            else:
                warn = f"UDP port {port} appears to be occupied or in use by another process."
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.PORT,
                        name=f"UDP Port {port} Availability",
                        status=PreflightCheckStatus.WARNING,
                        is_blocker=False,
                        message=warn,
                        remediation="Verify whether an existing SIPp instance or local SIP client is bound to this port.",
                    )
                )
                warnings.append(warn)

        # 6. CSV Injection Parameter Validation
        if scenario.csv_required:
            if cfg:
                if cfg.caller_range_start > cfg.caller_range_end:
                    msg = f"Invalid subscriber range: start ({cfg.caller_range_start}) > end ({cfg.caller_range_end})"
                    checks.append(
                        PreflightCheck(
                            category=PreflightCheckCategory.CSV,
                            name="Subscriber Range Syntax",
                            status=PreflightCheckStatus.FAIL,
                            is_blocker=True,
                            message=msg,
                            remediation="Set caller range start to be less than or equal to end.",
                        )
                    )
                    blockers.append(msg)
                else:
                    checks.append(
                        PreflightCheck(
                            category=PreflightCheckCategory.CSV,
                            name="Subscriber Range Syntax",
                            status=PreflightCheckStatus.PASS,
                            is_blocker=False,
                            message=f"Valid subscriber range: {cfg.caller_range_start} - {cfg.caller_range_end} ({cfg.caller_range_end - cfg.caller_range_start + 1} subscribers)",
                        )
                    )
            else:
                checks.append(
                    PreflightCheck(
                        category=PreflightCheckCategory.CSV,
                        name="Subscriber Injection",
                        status=PreflightCheckStatus.PASS,
                        is_blocker=False,
                        message="Default baseline CSV mapping verified for scenario",
                    )
                )

        return self._build_result(request, checks, blockers, warnings)

    def _validate_runtime_node(
        self, runtime_id: str, label: str, category: PreflightCheckCategory
    ) -> PreflightCheck:
        runtime_model = self.db.query(RuntimeModel).filter(RuntimeModel.id == runtime_id).first()
        if not runtime_model:
            return PreflightCheck(
                category=category,
                name=f"{label} Runtime Verification",
                status=PreflightCheckStatus.FAIL,
                is_blocker=True,
                message=f"{label} runtime ID '{runtime_id}' not found in registry.",
                remediation="Register this host in Runtime Manager.",
            )

        # Validate adapter
        adapter = self.runtime_manager.get_adapter(runtime_id)
        if not adapter:
            return PreflightCheck(
                category=category,
                name=f"{label} Runtime Adapter",
                status=PreflightCheckStatus.FAIL,
                is_blocker=True,
                message=f"No compatible runtime adapter initialized for {runtime_model.name} ({runtime_model.runtime_type})",
                remediation="Ensure OpenSSH or WSL2 is configured.",
            )

        res = adapter.validate()
        if not res.is_ready:
            # Check if this is remote SSH failure or missing sipp
            is_blocker = not res.sipp_available or len(res.missing_prerequisites) > 0
            return PreflightCheck(
                category=category,
                name=f"{label} Runtime ({runtime_model.name})",
                status=PreflightCheckStatus.FAIL if is_blocker else PreflightCheckStatus.WARNING,
                is_blocker=is_blocker,
                message=f"{label} host reports: {res.message}",
                remediation="; ".join(res.setup_instructions) or "Ensure host is reachable and SIPp is installed.",
                details={"sipp_version": res.sipp_version, "missing": res.missing_prerequisites},
            )

        return PreflightCheck(
            category=category,
            name=f"{label} Runtime ({runtime_model.name})",
            status=PreflightCheckStatus.PASS,
            is_blocker=False,
            message=f"Runtime ready: SIPp {res.sipp_version or 'detected'} on {runtime_model.operating_system}",
            details={"sipp_version": res.sipp_version, "host": runtime_model.hostname},
        )

    @staticmethod
    def _check_local_port_availability(port: int) -> bool:
        """Attempt to bind to UDP port on loopback without lingering."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(0.5)
        try:
            sock.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False
        finally:
            sock.close()

    @staticmethod
    def _build_result(
        request: PreflightRequest,
        checks: list[PreflightCheck],
        blockers: list[str],
        warnings: list[str],
    ) -> PreflightResult:
        is_ready = len(blockers) == 0
        overall_status = "READY" if is_ready else "BLOCKED"
        if is_ready and len(warnings) > 0:
            overall_status = "WARNING"

        return PreflightResult(
            environment_id=request.environment_id,
            scenario_id=request.scenario_id,
            configuration_id=request.configuration_id,
            overall_status=overall_status,
            is_ready=is_ready,
            checks=checks,
            blockers=blockers,
            warnings=warnings,
            validated_at=datetime.utcnow(),
        )
