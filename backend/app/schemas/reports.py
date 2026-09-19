from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ReportCreate(BaseModel):
    category: str = Field(..., max_length=40)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: str = Field(..., min_length=1, max_length=1000)
    photo_ref: Optional[str] = Field(default=None, max_length=255)

class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    latitude: float
    longitude: float
    description: str
    photo_ref: Optional[str]
    status: str
    duplicate_of: Optional[int]
    created_at: datetime
    updated_at: datetime
