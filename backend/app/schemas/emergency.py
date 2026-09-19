from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class EmergencyAlertCreate(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    status: str = "draft"

class EmergencyAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    is_mock: bool
    notified_contact_ids: Optional[List[int]]
    created_at: datetime
    closed_at: Optional[datetime]
