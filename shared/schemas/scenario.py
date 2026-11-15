from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ScenarioRole(str, Enum):
    UAC = "UAC"
    UAS = "UAS"
    REG = "REG"
    MIXED = "MIXED"


class ScenarioCategory(str, Enum):
    REGISTRATION = "Registration"
    BASIC_CALLING = "Basic Calling"
    AUTHENTICATION = "Authentication"
    PRACK = "PRACK"
    AUTHENTICATION_PRACK = "Authentication + PRACK"
    PUBLISH = "PUBLISH"
    NEGATIVE_TESTING = "Negative Testing"
    CUSTOM = "Custom"


class ScenarioValidationStatus(str, Enum):
    VALID = "VALID"
    WARNING = "WARNING"
    INVALID = "INVALID"


class ScenarioMetadata(BaseModel):
    id: str
    name: str
    filename: str
    role: ScenarioRole
    description: str
    categories: List[str] = Field(default_factory=list)
    methods: List[str] = Field(default_factory=list)
    authentication: bool = False
    prack: bool = False
    media: bool = False
    codecs: List[str] = Field(default_factory=list)
    publish: bool = False
    csv_required: bool = False
    csv_fields: List[str] = Field(default_factory=list)
    validation_status: ScenarioValidationStatus = ScenarioValidationStatus.VALID
    validation_errors: List[str] = Field(default_factory=list)
    source_path: str
    element_count: int = 0
    raw_xml: Optional[str] = None


class ScenarioFilter(BaseModel):
    category: Optional[str] = None
    role: Optional[ScenarioRole] = None
    method: Optional[str] = None
    auth: Optional[bool] = None
    prack: Optional[bool] = None
    media: Optional[bool] = None
    search: Optional[str] = None
