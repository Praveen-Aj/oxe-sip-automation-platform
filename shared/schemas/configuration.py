from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class TestConfigurationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    environment_id: str
    scenario_id: str
    caller_runtime_id: Optional[str] = None
    called_runtime_id: Optional[str] = None
    
    # Subscriber & Dialplan Settings
    caller_range_start: int = Field(default=55001, ge=1000, le=999999)
    caller_range_end: int = Field(default=55010, ge=1000, le=999999)
    called_range_start: int = Field(default=55011, ge=1000, le=999999)
    called_range_end: int = Field(default=55020, ge=1000, le=999999)
    
    # Ports & Networking
    caller_port: int = Field(default=5060, ge=1, le=65535)
    called_port: int = Field(default=5080, ge=1, le=65535)
    transport: str = Field(default="UDP")
    
    # Traffic Generation Parameters
    call_rate: float = Field(default=10.0, gt=0, le=500.0)
    call_count: int = Field(default=100, gt=0, le=100000)
    duration_seconds: Optional[int] = Field(default=None, ge=1, le=86400)
    
    # Protocol & Media Flags
    auth_enabled: bool = False
    auth_password: Optional[str] = None
    prack_enabled: bool = False
    media_enabled: bool = True
    codec: Optional[str] = "PCMA"
    
    # Custom Parameters
    custom_parameters: Dict[str, Any] = Field(default_factory=dict)


class TestConfigurationCreate(TestConfigurationBase):
    pass


class TestConfigurationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    caller_range_start: Optional[int] = None
    caller_range_end: Optional[int] = None
    called_range_start: Optional[int] = None
    called_range_end: Optional[int] = None
    caller_port: Optional[int] = None
    called_port: Optional[int] = None
    transport: Optional[str] = None
    call_rate: Optional[float] = None
    call_count: Optional[int] = None
    duration_seconds: Optional[int] = None
    auth_enabled: Optional[bool] = None
    auth_password: Optional[str] = None
    prack_enabled: Optional[bool] = None
    media_enabled: Optional[bool] = None
    codec: Optional[str] = None
    custom_parameters: Optional[Dict[str, Any]] = None


class TestConfigurationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    environment_id: str
    scenario_id: str
    caller_runtime_id: Optional[str] = None
    called_runtime_id: Optional[str] = None
    caller_range_start: int
    caller_range_end: int
    called_range_start: int
    called_range_end: int
    caller_port: int
    called_port: int
    transport: str
    call_rate: float
    call_count: int
    duration_seconds: Optional[int] = None
    auth_enabled: bool
    auth_password_masked: Optional[str] = None
    prack_enabled: bool
    media_enabled: bool
    codec: Optional[str] = None
    custom_parameters: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class CSVPreviewResponse(BaseModel):
    filename: str
    delimiter: str
    total_rows: int
    headers: list[str]
    sample_rows: list[list[str]]
    permissions: str
    temp_path: Optional[str] = None
