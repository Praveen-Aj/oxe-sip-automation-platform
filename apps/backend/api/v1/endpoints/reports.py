from fastapi import APIRouter, HTTPException, Query, Response, status

from apps.backend.services.reporting_service import ReportingService
from shared.schemas.reporting import ExecutionReport, ReportFormat

router = APIRouter()
reporting_service = ReportingService()


@router.get("/{execution_id}", response_model=ExecutionReport)
def get_report(execution_id: str, format: ReportFormat = Query(ReportFormat.JSON)):
    """Retrieve structured execution report in JSON, HTML, or CSV format."""
    try:
        report = reporting_service.generate_report(execution_id, fmt=format)
        if format == ReportFormat.HTML and report.html_content:
            return Response(content=report.html_content, media_type="text/html")
        elif format == ReportFormat.CSV and report.csv_metrics_content:
            return Response(content=report.csv_metrics_content, media_type="text/csv")
        return report
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
