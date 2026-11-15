import csv
import io
import uuid
from datetime import datetime

from apps.backend.core.credentials import credential_vault
from apps.backend.core.database import EnvironmentModel, ExecutionModel, SessionLocal
from apps.backend.services.diagnostics_service import DiagnosticsService
from shared.schemas.execution import ExecutionMode, ExecutionState, SIPMetricsSnapshot
from shared.schemas.reporting import ExecutionReport, ReportFormat


class ReportingService:
    """
    Generates structured HTML, JSON, and CSV execution reports.
    Clearly distinguishes Simulated test runs from Physical PBX validations.
    """

    def __init__(self):
        self.diagnostics_service = DiagnosticsService()

    def generate_report(self, execution_id: str, fmt: ReportFormat = ReportFormat.JSON) -> ExecutionReport:
        db = SessionLocal()
        try:
            exec_model = db.query(ExecutionModel).filter(ExecutionModel.id == execution_id).first()
            if not exec_model:
                raise ValueError(f"Execution '{execution_id}' not found.")

            env = db.query(EnvironmentModel).filter(EnvironmentModel.id == exec_model.environment_id).first()
            env_name = env.name if env else exec_model.environment_id
            pbx_target = f"{env.pbx_host}:{env.pbx_port}" if (env and env.pbx_host) else "N/A"

            diag_report = self.diagnostics_service.analyze_execution(execution_id)

            metrics = SIPMetricsSnapshot(
                timestamp=exec_model.end_time or datetime.utcnow(),
                elapsed_seconds=exec_model.duration_seconds,
                total_calls=exec_model.total_calls,
                successful_calls=exec_model.successful_calls,
                failed_calls=exec_model.failed_calls,
                current_cps=exec_model.call_rate,
                active_calls=0,
                retransmissions=exec_model.retransmissions,
                timeouts=exec_model.timeouts,
                response_distribution=exec_model.get_response_distribution(),
            )

            report_id = f"rep-{uuid.uuid4().hex[:8]}"

            # Generate HTML content
            mode_badge_color = "#38bdf8" if exec_model.mode == "SIMULATED" else "#a855f7"
            status_color = "#34d399" if exec_model.state == "COMPLETED" else "#f87171"

            html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OXE SIP Execution Report - {execution_id}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #f8fafc; padding: 2rem; margin: 0; }}
    .header {{ border-b: 1px solid #1e293b; padding-bottom: 1rem; margin-bottom: 2rem; }}
    .badge {{ display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-family: monospace; font-weight: bold; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
    .card {{ background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 1rem; }}
    .label {{ font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-family: monospace; }}
    .value {{ font-size: 1.5rem; font-weight: bold; margin-top: 0.5rem; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 1rem; }}
    th, td {{ border: 1px solid #1e293b; padding: 0.75rem; text-align: left; font-size: 0.85rem; }}
    th {{ background: #1e293b; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class="header">
    <h2>OXE SIP Test Execution Report: {execution_id}</h2>
    <span class="badge" style="background: {mode_badge_color}; color: #000;">{exec_model.mode} EXECUTION</span>
    <span class="badge" style="background: {status_color}; color: #000; margin-left: 0.5rem;">{exec_model.state}</span>
    <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.5rem;">
      Environment: <strong>{env_name}</strong> | Target PBX: <strong>{pbx_target}</strong> | Scenario: <strong>{exec_model.scenario_id}</strong>
    </p>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">Total Calls</div>
      <div class="value">{exec_model.total_calls}</div>
    </div>
    <div class="card">
      <div class="label">Successful Calls</div>
      <div class="value" style="color: #34d399;">{exec_model.successful_calls}</div>
    </div>
    <div class="card">
      <div class="label">Failed Calls</div>
      <div class="value" style="color: #f87171;">{exec_model.failed_calls}</div>
    </div>
    <div class="card">
      <div class="label">Duration</div>
      <div class="value">{exec_model.duration_seconds}s</div>
    </div>
  </div>

  <h3>SIP Response Distribution</h3>
  <table>
    <tr><th>SIP Response Code</th><th>Occurrences</th></tr>
    {''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k, v in metrics.response_distribution.items())}
  </table>

  <h3>Diagnostic Events ({diag_report.total_events})</h3>
  <p style="color: #94a3b8; font-size: 0.85rem;">Root Cause: <em>{diag_report.root_cause_summary or 'No anomalies.'}</em></p>
</body>
</html>"""

            # Generate CSV metrics content
            csv_out = io.StringIO()
            writer = csv.writer(csv_out)
            writer.writerow(["execution_id", "mode", "state", "total_calls", "successful_calls", "failed_calls", "duration_seconds"])
            writer.writerow([execution_id, exec_model.mode, exec_model.state, exec_model.total_calls, exec_model.successful_calls, exec_model.failed_calls, exec_model.duration_seconds])
            csv_content = csv_out.getvalue()

            return ExecutionReport(
                id=report_id,
                execution_id=execution_id,
                generated_at=datetime.utcnow(),
                mode=ExecutionMode(exec_model.mode),
                final_state=ExecutionState(exec_model.state),
                environment_name=env_name,
                scenario_name=exec_model.scenario_id,
                pbx_target=pbx_target,
                caller_runtime=exec_model.caller_runtime_id or "local",
                called_runtime=exec_model.called_runtime_id or "local",
                duration_seconds=exec_model.duration_seconds,
                metrics=metrics,
                diagnostics_summary={
                    "total_events": diag_report.total_events,
                    "critical": diag_report.critical_count,
                    "errors": diag_report.error_count,
                    "warnings": diag_report.warning_count,
                    "root_cause": diag_report.root_cause_summary,
                },
                key_events=diag_report.events,
                html_content=credential_vault.sanitize_text(html),
                csv_metrics_content=credential_vault.sanitize_text(csv_content),
            )
        finally:
            db.close()
