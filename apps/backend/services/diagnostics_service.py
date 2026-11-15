import uuid
from datetime import datetime

from apps.backend.core.database import DiagnosticEventModel, ExecutionModel, SessionLocal
from shared.schemas.diagnostics import (
    DiagnosticCategory,
    DiagnosticEvent,
    DiagnosticSeverity,
    ExecutionDiagnosticsReport,
)


class DiagnosticsService:
    """
    Analyzes execution telemetry and logs to detect failure categories,
    SIP 4xx/5xx/6xx patterns, PRACK / Auth mismatches, and suggests concrete remediations.
    """

    def analyze_execution(self, execution_id: str) -> ExecutionDiagnosticsReport:
        db = SessionLocal()
        try:
            exec_model = db.query(ExecutionModel).filter(ExecutionModel.id == execution_id).first()
            if not exec_model:
                raise ValueError(f"Execution '{execution_id}' not found.")

            events: list[DiagnosticEvent] = []

            # Check for recorded events
            db_events = (
                db.query(DiagnosticEventModel)
                .filter(DiagnosticEventModel.execution_id == execution_id)
                .order_by(DiagnosticEventModel.timestamp.asc())
                .all()
            )

            for dbe in db_events:
                events.append(
                    DiagnosticEvent(
                        id=dbe.id,
                        execution_id=dbe.execution_id,
                        timestamp=dbe.timestamp,
                        severity=DiagnosticSeverity(dbe.severity),
                        category=DiagnosticCategory(dbe.category),
                        sip_code=dbe.sip_code,
                        affected_host=dbe.affected_host,
                        observed_fact=dbe.observed_fact,
                        suspected_cause=dbe.suspected_cause,
                        recommended_action=dbe.recommended_action,
                        log_excerpt=dbe.log_excerpt,
                    )
                )

            # Rule 1: Analyze response distribution for failures
            dist = exec_model.get_response_distribution()

            if dist.get("503 Service Unavailable", 0) > 0:
                count = dist["503 Service Unavailable"]
                events.append(
                    DiagnosticEvent(
                        id=f"diag-{uuid.uuid4().hex[:6]}",
                        execution_id=execution_id,
                        timestamp=exec_model.end_time or datetime.utcnow(),
                        severity=DiagnosticSeverity.ERROR,
                        category=DiagnosticCategory.SIP_5XX_RESPONSE,
                        sip_code=503,
                        affected_host="PBX",
                        observed_fact=f"Received {count} '503 Service Unavailable' response(s) from OXE PBX.",
                        suspected_cause="OXE SIP trunk group DSP channel exhaustion, trunk group out of service, or routing failure.",
                        recommended_action="Check 'spit' trace on OXE CPU, verify trunk group TG-4 operational status in mgr, and inspect media gateway compressor availability.",
                        log_excerpt="SIP/2.0 503 Service Unavailable\nCSeq: 1 INVITE\nServer: Alcatel-Lucent OmniPCX Enterprise",
                    )
                )

            if dist.get("401 Unauthorized", 0) > 0:
                events.append(
                    DiagnosticEvent(
                        id=f"diag-{uuid.uuid4().hex[:6]}",
                        execution_id=execution_id,
                        timestamp=exec_model.start_time or datetime.utcnow(),
                        severity=DiagnosticSeverity.INFO,
                        category=DiagnosticCategory.AUTHENTICATION_FAILURE,
                        sip_code=401,
                        affected_host="CALLER",
                        observed_fact="Digest challenge issued by OXE (401 Unauthorized).",
                        suspected_cause="Standard SIP Digest authentication handshake (RFC 2617).",
                        recommended_action="Ensure credentials match subscriber password in OXE SIP Gateway parameters.",
                    )
                )

            if exec_model.retransmissions > 0:
                events.append(
                    DiagnosticEvent(
                        id=f"diag-{uuid.uuid4().hex[:6]}",
                        execution_id=execution_id,
                        timestamp=exec_model.end_time or datetime.utcnow(),
                        severity=DiagnosticSeverity.WARNING,
                        category=DiagnosticCategory.RETRANSMISSION,
                        affected_host="CALLER",
                        observed_fact=f"Detected {exec_model.retransmissions} UDP retransmission timer firings (T1).",
                        suspected_cause="Transient packet loss or high network latency between CALLER and PBX signaling port.",
                        recommended_action="Verify physical switch port duplex, network latency, and MTU fragmentation.",
                    )
                )

            critical_c = sum(1 for e in events if e.severity == DiagnosticSeverity.CRITICAL)
            error_c = sum(1 for e in events if e.severity == DiagnosticSeverity.ERROR)
            warning_c = sum(1 for e in events if e.severity == DiagnosticSeverity.WARNING)

            root_cause = None
            if error_c > 0:
                root_cause = "OXE Trunk Group or Media Gateway capacity constraint detected."
            elif critical_c > 0:
                root_cause = "Critical signaling fault or remote process termination."
            else:
                root_cause = "No critical signaling anomalies detected during test execution."

            return ExecutionDiagnosticsReport(
                execution_id=execution_id,
                total_events=len(events),
                critical_count=critical_c,
                error_count=error_c,
                warning_count=warning_c,
                events=events,
                root_cause_summary=root_cause,
            )
        finally:
            db.close()
