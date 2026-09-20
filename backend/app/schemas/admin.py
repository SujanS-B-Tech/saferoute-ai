from typing import Optional
from pydantic import BaseModel, Field

class ReportModeration(BaseModel):
    status: str = Field(..., description="Must be approved or rejected")
    note: Optional[str] = Field(default=None, max_length=255)

class ManualOverrideCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity_label: str = Field(..., max_length=40, description="E.g., admin_override")
