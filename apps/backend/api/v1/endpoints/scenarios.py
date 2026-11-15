
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

from apps.backend.services.scenario_service import ScenarioService
from shared.schemas.scenario import ScenarioFilter, ScenarioMetadata, ScenarioRole

router = APIRouter()
scenario_service = ScenarioService()


@router.get("", response_model=list[ScenarioMetadata])
def list_scenarios(
    category: str | None = Query(None, description="Filter by category"),
    role: ScenarioRole | None = Query(None, description="Filter by role (UAC, UAS, REG)"),
    method: str | None = Query(None, description="Filter by SIP method"),
    auth: bool | None = Query(None, description="Filter by authentication requirement"),
    prack: bool | None = Query(None, description="Filter by PRACK support"),
    media: bool | None = Query(None, description="Filter by SDP/media requirement"),
    search: str | None = Query(None, description="Search keyword in name or description"),
):
    """List all available SIP scenarios with dynamic filtering."""
    criteria = ScenarioFilter(
        category=category,
        role=role,
        method=method,
        auth=auth,
        prack=prack,
        media=media,
        search=search,
    )
    return scenario_service.filter_scenarios(criteria)


@router.post("/discover", response_model=list[ScenarioMetadata])
def discover_scenarios():
    """Trigger on-demand re-discovery of scenarios from assets/sipp/ directory."""
    return scenario_service.discover_scenarios()


@router.get("/{scenario_id}", response_model=ScenarioMetadata)
def get_scenario(scenario_id: str):
    """Retrieve detailed metadata for a specific scenario."""
    scenario = scenario_service.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return scenario


@router.get("/{scenario_id}/metadata", response_model=ScenarioMetadata)
def get_scenario_metadata(scenario_id: str):
    """Alias for scenario metadata inspection."""
    return get_scenario(scenario_id)


@router.post("/{scenario_id}/validate", response_model=ScenarioMetadata)
def validate_scenario(scenario_id: str):
    """Re-validate scenario XML schema and structure."""
    scenario = scenario_service.validate_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return scenario


@router.get("/{scenario_id}/content", response_class=PlainTextResponse)
def get_scenario_xml_content(scenario_id: str):
    """Inspect raw scenario XML text for advanced technical auditing."""
    content = scenario_service.get_scenario_raw_xml(scenario_id)
    if content is None:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' content not found.")
    return PlainTextResponse(content=content, media_type="application/xml")
