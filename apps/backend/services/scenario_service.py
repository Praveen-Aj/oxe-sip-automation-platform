import logging
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from shared.schemas.scenario import (
    ScenarioCategory,
    ScenarioFilter,
    ScenarioMetadata,
    ScenarioRole,
    ScenarioValidationStatus,
)

logger = logging.getLogger(__name__)


class ScenarioService:
    def __init__(self, assets_dir: Path | None = None):
        if assets_dir is None:
            # Resolve relative to repo root
            root_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.assets_dir = root_dir / "assets" / "sipp"
        else:
            self.assets_dir = Path(assets_dir)

        self._cache: dict[str, ScenarioMetadata] = {}
        self.discover_scenarios()

    def discover_scenarios(self) -> list[ScenarioMetadata]:
        """Dynamically scan assets/sipp/ directory and parse all scenario XML files."""
        if not self.assets_dir.exists():
            logger.warning(f"Scenario directory {self.assets_dir} does not exist.")
            return []

        scenarios: list[ScenarioMetadata] = []
        for xml_file in sorted(self.assets_dir.glob("*.xml")):
            try:
                metadata = self._parse_scenario_file(xml_file)
                self._cache[metadata.id] = metadata
                scenarios.append(metadata)
            except Exception as e:
                logger.error(f"Failed to inspect scenario {xml_file.name}: {e}")
                # Create invalid metadata entry
                slug = self._slugify(xml_file.stem)
                invalid_meta = ScenarioMetadata(
                    id=slug,
                    name=xml_file.stem,
                    filename=xml_file.name,
                    role=ScenarioRole.MIXED,
                    description=f"Corrupted or invalid scenario file: {e}",
                    validation_status=ScenarioValidationStatus.INVALID,
                    validation_errors=[str(e)],
                    source_path=str(xml_file.relative_to(self.assets_dir.parent.parent).as_posix()),
                )
                self._cache[slug] = invalid_meta
                scenarios.append(invalid_meta)

        return scenarios

    def get_scenario(self, scenario_id: str) -> ScenarioMetadata | None:
        """Retrieve a scenario by ID or filename."""
        if scenario_id in self._cache:
            return self._cache[scenario_id]

        # Try matching by filename
        for s in self._cache.values():
            if s.filename == scenario_id or s.filename == f"{scenario_id}.xml":
                return s
        return None

    def get_scenario_raw_xml(self, scenario_id: str) -> str | None:
        """Read and return raw XML content."""
        scenario = self.get_scenario(scenario_id)
        if not scenario:
            return None
        file_path = self.assets_dir / scenario.filename
        if file_path.exists():
            return file_path.read_text(encoding="ISO-8859-1", errors="replace")
        return None

    def validate_scenario(self, scenario_id: str) -> ScenarioMetadata | None:
        """Re-validate scenario XML and return updated metadata."""
        scenario = self.get_scenario(scenario_id)
        if not scenario:
            return None
        file_path = self.assets_dir / scenario.filename
        metadata = self._parse_scenario_file(file_path)
        self._cache[metadata.id] = metadata
        return metadata

    def filter_scenarios(self, criteria: ScenarioFilter) -> list[ScenarioMetadata]:
        """Filter cached scenarios by category, role, method, auth, prack, or search keyword."""
        results = list(self._cache.values())

        if criteria.category:
            results = [s for s in results if criteria.category.lower() in [c.lower() for c in s.categories]]

        if criteria.role:
            results = [s for s in results if s.role == criteria.role]

        if criteria.method:
            results = [s for s in results if criteria.method.upper() in [m.upper() for m in s.methods]]

        if criteria.auth is not None:
            results = [s for s in results if s.authentication == criteria.auth]

        if criteria.prack is not None:
            results = [s for s in results if s.prack == criteria.prack]

        if criteria.media is not None:
            results = [s for s in results if s.media == criteria.media]

        if criteria.search:
            q = criteria.search.lower()
            results = [
                s for s in results
                if q in s.name.lower() or q in s.description.lower() or q in s.filename.lower()
            ]

        return results

    def _parse_scenario_file(self, file_path: Path) -> ScenarioMetadata:
        content = file_path.read_text(encoding="ISO-8859-1", errors="replace")
        slug = self._slugify(file_path.stem)
        validation_errors: list[str] = []
        validation_status = ScenarioValidationStatus.VALID

        # XML Structural Parsing
        try:
            tree = ET.fromstring(content)
            element_count = len(list(tree.iter()))
        except Exception as e:
            validation_status = ScenarioValidationStatus.INVALID
            validation_errors.append(f"XML Parse Error: {e}")
            element_count = 0

        # Extract SIP Methods
        methods = set()
        for method_match in re.findall(r"\b(INVITE|ACK|BYE|CANCEL|PRACK|REGISTER|PUBLISH|OPTIONS|INFO|UPDATE|SUBSCRIBE|NOTIFY)\b", content):
            methods.add(method_match)
        method_list = sorted(list(methods))

        # Detect UAC / UAS / REG Role
        role = ScenarioRole.UAC
        first_send = re.search(r"<send\b", content)
        first_recv = re.search(r"<recv\b", content)

        if "REGISTER" in method_list:
            role = ScenarioRole.REG
        elif first_recv and (not first_send or first_recv.start() < first_send.start()):
            role = ScenarioRole.UAS
        elif first_send:
            role = ScenarioRole.UAC

        # Detect Authentication (401/407 Digest)
        has_auth = False
        if "[authentication" in content or "401" in content or "407" in content or "Proxy-Authenticate" in content:
            has_auth = True

        # Detect PRACK (100rel)
        has_prack = False
        if "100rel" in content or "PRACK" in method_list or "RAck:" in content or "RSeq:" in content:
            has_prack = True

        # Detect PUBLISH
        has_publish = "PUBLISH" in method_list

        # Detect Media & SDP Codecs
        has_media = False
        codecs = []
        if "m=audio" in content or "application/sdp" in content:
            has_media = True
            codec_matches = re.findall(r"a=rtpmap:\d+\s+([A-Za-z0-9_-]+)", content)
            codecs = sorted(list(set(codec_matches)))
            if not codecs and "RTP/AVP 0" in content:
                codecs = ["PCMU"]

        # Detect CSV field references ([field0], [field1], etc.)
        field_matches = sorted(list(set(re.findall(r"\[field(\d+)\]", content))))
        csv_required = len(field_matches) > 0
        csv_fields = [f"field{idx}" for idx in sorted([int(m) for m in field_matches])]

        # Assign user-friendly categories
        categories = []
        if role == ScenarioRole.REG or "REGISTER" in file_path.stem:
            categories.append(ScenarioCategory.REGISTRATION.value)
        if has_auth and has_prack:
            categories.append(ScenarioCategory.AUTHENTICATION_PRACK.value)
        if has_auth and not has_prack:
            categories.append(ScenarioCategory.AUTHENTICATION.value)
        if has_prack and not has_auth:
            categories.append(ScenarioCategory.PRACK.value)
        if not has_auth and not has_prack and role in (ScenarioRole.UAC, ScenarioRole.UAS) and role != ScenarioRole.REG:
            categories.append(ScenarioCategory.BASIC_CALLING.value)
        if has_publish:
            categories.append(ScenarioCategory.PUBLISH.value)

        # Derive user-friendly description and title
        formatted_name = file_path.stem.replace("_", " ")
        description = self._generate_description(file_path.stem, role, has_auth, has_prack, has_publish)

        relative_path = file_path.relative_to(self.assets_dir.parent.parent).as_posix()

        return ScenarioMetadata(
            id=slug,
            name=formatted_name,
            filename=file_path.name,
            role=role,
            description=description,
            categories=categories,
            methods=method_list,
            authentication=has_auth,
            prack=has_prack,
            media=has_media,
            codecs=codecs,
            publish=has_publish,
            csv_required=csv_required,
            csv_fields=csv_fields,
            validation_status=validation_status,
            validation_errors=validation_errors,
            source_path=relative_path,
            element_count=element_count,
        )

    @staticmethod
    def _slugify(name: str) -> str:
        s = name.lower().replace("_", "-")
        return re.sub(r"[^a-z0-9-]", "", s)

    @staticmethod
    def _generate_description(stem: str, role: ScenarioRole, auth: bool, prack: bool, publish: bool) -> str:
        parts = []
        if role == ScenarioRole.REG:
            parts.append("SIP Registration scenario")
        elif role == ScenarioRole.UAS:
            parts.append("UAS answering scenario (Called side)")
        else:
            parts.append("UAC outbound call scenario (Caller side)")

        if auth and prack:
            parts.append("with Digest Authentication (401/407) and 100rel PRACK handling")
        elif auth:
            parts.append("with Digest Authentication (401/407 challenge handshake)")
        elif prack:
            parts.append("with 100rel provisional reliability (PRACK/RAck)")

        if publish:
            parts.append("and post-BYE VoIP-Metrics-Collector PUBLISH reporting")

        return " ".join(parts) + "."
