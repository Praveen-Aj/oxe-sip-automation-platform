import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from apps.backend.core.database import ConfigurationModel, EnvironmentModel
from apps.backend.services.csv_generator import CSVGeneratorService
from shared.schemas.configuration import (
    CSVPreviewResponse,
    TestConfigurationCreate,
    TestConfigurationResponse,
    TestConfigurationUpdate,
)


class ConfigurationService:
    def __init__(self, db: Session, csv_generator: CSVGeneratorService | None = None):
        self.db = db
        self.csv_generator = csv_generator or CSVGeneratorService()

    def create_configuration(self, config_in: TestConfigurationCreate) -> TestConfigurationResponse:
        config_id = f"cfg-{uuid.uuid4().hex[:8]}"
        password_masked = "********" if config_in.auth_password else None

        model = ConfigurationModel(
            id=config_id,
            name=config_in.name,
            description=config_in.description,
            environment_id=config_in.environment_id,
            scenario_id=config_in.scenario_id,
            caller_runtime_id=config_in.caller_runtime_id,
            called_runtime_id=config_in.called_runtime_id,
            caller_range_start=config_in.caller_range_start,
            caller_range_end=config_in.caller_range_end,
            called_range_start=config_in.called_range_start,
            called_range_end=config_in.called_range_end,
            caller_port=config_in.caller_port,
            called_port=config_in.called_port,
            transport=config_in.transport,
            call_rate=config_in.call_rate,
            call_count=config_in.call_count,
            duration_seconds=config_in.duration_seconds,
            auth_enabled=config_in.auth_enabled,
            auth_password_masked=password_masked,
            prack_enabled=config_in.prack_enabled,
            media_enabled=config_in.media_enabled,
            codec=config_in.codec,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        model.set_custom_parameters(config_in.custom_parameters)

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)

        return self._to_response(model)

    def get_configuration(self, config_id: str) -> TestConfigurationResponse | None:
        model = self.db.query(ConfigurationModel).filter(ConfigurationModel.id == config_id).first()
        if not model:
            return None
        return self._to_response(model)

    def list_configurations(
        self, environment_id: str | None = None, scenario_id: str | None = None
    ) -> list[TestConfigurationResponse]:
        query = self.db.query(ConfigurationModel)
        if environment_id:
            query = query.filter(ConfigurationModel.environment_id == environment_id)
        if scenario_id:
            query = query.filter(ConfigurationModel.scenario_id == scenario_id)

        models = query.order_by(ConfigurationModel.created_at.desc()).all()
        return [self._to_response(m) for m in models]

    def update_configuration(
        self, config_id: str, update_in: TestConfigurationUpdate
    ) -> TestConfigurationResponse | None:
        model = self.db.query(ConfigurationModel).filter(ConfigurationModel.id == config_id).first()
        if not model:
            return None

        update_dict = update_in.dict(exclude_unset=True)
        if "auth_password" in update_dict:
            pw = update_dict.pop("auth_password")
            model.auth_password_masked = "********" if pw else None

        if "custom_parameters" in update_dict:
            params = update_dict.pop("custom_parameters")
            if params is not None:
                model.set_custom_parameters(params)

        for key, val in update_dict.items():
            if hasattr(model, key):
                setattr(model, key, val)

        model.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(model)

        return self._to_response(model)

    def duplicate_configuration(self, config_id: str) -> TestConfigurationResponse | None:
        original = self.db.query(ConfigurationModel).filter(ConfigurationModel.id == config_id).first()
        if not original:
            return None

        new_id = f"cfg-{uuid.uuid4().hex[:8]}"
        new_name = f"Copy of {original.name}"

        clone = ConfigurationModel(
            id=new_id,
            name=new_name,
            description=original.description,
            environment_id=original.environment_id,
            scenario_id=original.scenario_id,
            caller_runtime_id=original.caller_runtime_id,
            called_runtime_id=original.called_runtime_id,
            caller_range_start=original.caller_range_start,
            caller_range_end=original.caller_range_end,
            called_range_start=original.called_range_start,
            called_range_end=original.called_range_end,
            caller_port=original.caller_port,
            called_port=original.called_port,
            transport=original.transport,
            call_rate=original.call_rate,
            call_count=original.call_count,
            duration_seconds=original.duration_seconds,
            auth_enabled=original.auth_enabled,
            auth_password_masked=original.auth_password_masked,
            prack_enabled=original.prack_enabled,
            media_enabled=original.media_enabled,
            codec=original.codec,
            custom_parameters_json=original.custom_parameters_json,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.db.add(clone)
        self.db.commit()
        self.db.refresh(clone)

        return self._to_response(clone)

    def delete_configuration(self, config_id: str) -> bool:
        model = self.db.query(ConfigurationModel).filter(ConfigurationModel.id == config_id).first()
        if not model:
            return False
        self.db.delete(model)
        self.db.commit()
        return True

    def generate_csv_for_configuration(self, config_id: str) -> CSVPreviewResponse:
        model = self.db.query(ConfigurationModel).filter(ConfigurationModel.id == config_id).first()
        if not model:
            raise ValueError(f"Configuration '{config_id}' not found.")

        # Lookup linked environment for target PBX IP (defaults to loopback for simulated configs)
        env = self.db.query(EnvironmentModel).filter(EnvironmentModel.id == model.environment_id).first()
        oxe_ip = env.pbx_host if (env and env.pbx_host) else "127.0.0.1"
        oxe_port = env.pbx_port if (env and env.pbx_port) else 5060

        # Check if scenario is registration or call
        is_reg = "register" in model.scenario_id.lower()
        if is_reg:
            _, preview = self.csv_generator.generate_registration_csv(
                range_start=model.caller_range_start,
                range_end=model.caller_range_end,
                oxe_ip=oxe_ip,
                role="CALLER",
                auth_enabled=model.auth_enabled,
                auth_password="secret",
                prefix_tag=model.id
            )
        else:
            _, preview = self.csv_generator.generate_caller_call_csv(
                caller_start=model.caller_range_start,
                caller_end=model.caller_range_end,
                called_start=model.called_range_start,
                called_end=model.called_range_end,
                oxe_ip=oxe_ip,
                oxe_port=oxe_port,
                auth_enabled=model.auth_enabled,
                auth_password="secret",
                prefix_tag=model.id
            )

        return preview

    @staticmethod
    def _to_response(model: ConfigurationModel) -> TestConfigurationResponse:
        return TestConfigurationResponse(
            id=model.id,
            name=model.name,
            description=model.description,
            environment_id=model.environment_id,
            scenario_id=model.scenario_id,
            caller_runtime_id=model.caller_runtime_id,
            called_runtime_id=model.called_runtime_id,
            caller_range_start=model.caller_range_start,
            caller_range_end=model.caller_range_end,
            called_range_start=model.called_range_start,
            called_range_end=model.called_range_end,
            caller_port=model.caller_port,
            called_port=model.called_port,
            transport=model.transport,
            call_rate=model.call_rate,
            call_count=model.call_count,
            duration_seconds=model.duration_seconds,
            auth_enabled=model.auth_enabled,
            auth_password_masked=model.auth_password_masked,
            prack_enabled=model.prack_enabled,
            media_enabled=model.media_enabled,
            codec=model.codec,
            custom_parameters=model.get_custom_parameters(),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
