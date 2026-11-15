import json
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from apps.backend.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ExecutionModel(Base):
    __tablename__ = "executions"

    id = Column(String, primary_key=True, index=True)
    mode = Column(String, default="SIMULATED")  # SIMULATED | PHYSICAL
    state = Column(String, default="CREATED", index=True)
    environment_id = Column(String, nullable=False, index=True)
    scenario_id = Column(String, nullable=False, index=True)
    configuration_id = Column(String, nullable=True)

    caller_runtime_id = Column(String, nullable=True)
    called_runtime_id = Column(String, nullable=True)

    caller_pid = Column(Integer, nullable=True)
    called_pid = Column(Integer, nullable=True)
    caller_status = Column(String, default="IDLE")
    called_status = Column(String, default="IDLE")

    call_rate = Column(Float, default=10.0)
    call_count = Column(Integer, default=100)
    duration_limit = Column(Integer, nullable=True)

    total_calls = Column(Integer, default=0)
    successful_calls = Column(Integer, default=0)
    failed_calls = Column(Integer, default=0)
    retransmissions = Column(Integer, default=0)
    timeouts = Column(Integer, default=0)

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)

    response_distribution_json = Column(Text, default="{}")
    metrics_snapshot_json = Column(Text, default="{}")
    failure_reason = Column(String, nullable=True)

    log_caller_path = Column(String, nullable=True)
    log_called_path = Column(String, nullable=True)
    csv_generated_path = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_response_distribution(self, dist: dict):
        self.response_distribution_json = json.dumps(dist)

    def get_response_distribution(self) -> dict:
        try:
            return json.loads(self.response_distribution_json or "{}")
        except Exception:
            return {}


class DiagnosticEventModel(Base):
    __tablename__ = "diagnostic_events"

    id = Column(String, primary_key=True, index=True)
    execution_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    severity = Column(String, default="INFO")
    category = Column(String, default="UNKNOWN")
    sip_code = Column(Integer, nullable=True)
    affected_host = Column(String, default="CALLER")
    observed_fact = Column(Text, nullable=False)
    suspected_cause = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    log_excerpt = Column(Text, nullable=True)
    details_json = Column(Text, default="{}")


class ExecutionHistory(Base):
    __tablename__ = "execution_history"

    id = Column(String, primary_key=True, index=True)
    scenario_id = Column(String, nullable=False)
    environment_id = Column(String, default="default")
    state = Column(String, default="COMPLETED")
    total_calls = Column(Integer, default=0)
    successful_calls = Column(Integer, default=0)
    failed_calls = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConfigurationModel(Base):
    __tablename__ = "test_configurations"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    environment_id = Column(String, nullable=False, index=True)
    scenario_id = Column(String, nullable=False, index=True)
    caller_runtime_id = Column(String, nullable=True)
    called_runtime_id = Column(String, nullable=True)
    caller_range_start = Column(Integer, default=5000)
    caller_range_end = Column(Integer, default=5009)
    called_range_start = Column(Integer, default=6000)
    called_range_end = Column(Integer, default=6009)
    caller_port = Column(Integer, default=5060)
    called_port = Column(Integer, default=5080)
    transport = Column(String, default="UDP")
    call_rate = Column(Float, default=10.0)
    call_count = Column(Integer, default=100)
    duration_seconds = Column(Integer, nullable=True)
    auth_enabled = Column(Boolean, default=False)
    auth_password_masked = Column(String, nullable=True)
    prack_enabled = Column(Boolean, default=True)
    media_enabled = Column(Boolean, default=False)
    codec = Column(String, default="PCMU")
    custom_parameters_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_custom_parameters(self, params: dict):
        self.custom_parameters_json = json.dumps(params or {})

    def get_custom_parameters(self) -> dict:
        try:
            return json.loads(self.custom_parameters_json or "{}")
        except Exception:
            return {}


class RuntimeModel(Base):
    __tablename__ = "runtimes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    runtime_type = Column(String, nullable=False)
    role = Column(String, default="STANDALONE")
    hostname = Column(String, default="127.0.0.1")
    port = Column(Integer, default=22)
    username = Column(String, nullable=True)
    auth_method = Column(String, default="KEY")
    key_path = Column(String, nullable=True)
    password_masked = Column(String, nullable=True)
    wsl_distribution = Column(String, nullable=True)
    custom_sipp_path = Column(String, nullable=True)
    status = Column(String, default="UNAVAILABLE")
    sipp_available = Column(Boolean, default=False)
    sipp_version = Column(String, nullable=True)
    operating_system = Column(String, default="Unknown")
    diagnostics_json = Column(Text, default="{}")
    last_validated = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_diagnostics(self, diag_dict: dict):
        self.diagnostics_json = json.dumps(diag_dict)

    def get_diagnostics(self) -> dict:
        try:
            return json.loads(self.diagnostics_json or "{}")
        except Exception:
            return {}


class EnvironmentModel(Base):
    __tablename__ = "environments"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    environment_type = Column(String, default="LAB")
    lab_designation = Column(String, default="OXE-LAB-ROCKY-01")
    description = Column(String, nullable=True)
    pbx_host = Column(String, default="127.0.0.1")
    pbx_port = Column(Integer, default=5060)
    pbx_domain = Column(String, default="sip.enterprise")
    trunk_group = Column(Integer, default=4)
    caller_runtime_id = Column(String, nullable=True)
    caller_host = Column(String, default="127.0.0.1")
    caller_port = Column(Integer, default=5062)
    caller_interface = Column(String, default="eth0")
    called_runtime_id = Column(String, nullable=True)
    called_host = Column(String, default="127.0.0.1")
    called_port = Column(Integer, default=5080)
    called_interface = Column(String, default="eth0")
    sip_transport = Column(String, default="UDP")
    network_interface = Column(String, default="eth0")
    is_demo = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    status = Column(String, default="UNVALIDATED")
    validation_details_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_validation_details(self, details: dict):
        self.validation_details_json = json.dumps(details)

    def get_validation_details(self) -> dict:
        try:
            return json.loads(self.validation_details_json or "{}")
        except Exception:
            return {}


def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure backward-compatible column migration for local SQLite app.db
    with engine.connect() as conn:
        for col, col_type in [
            ("environment_type", "VARCHAR DEFAULT 'LAB'"),
            ("lab_designation", "VARCHAR DEFAULT 'OXE-LAB-ROCKY-01'"),
            ("caller_interface", "VARCHAR DEFAULT 'eth0'"),
            ("called_interface", "VARCHAR DEFAULT 'eth0'"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE environments ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
