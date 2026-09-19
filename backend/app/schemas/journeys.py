from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class JourneyCreate(BaseModel):
    route_id: Optional[int] = None
    origin_label: str = Field(..., max_length=200)
    destination_label: str = Field(..., max_length=200)
    expected_arrival: Optional[datetime] = None
    share_with_contact_ids: Optional[List[int]] = None
    expires_at: Optional[datetime] = None

class JourneyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    route_id: Optional[int]
    origin_label: str
    destination_label: str
    status: str
    share_with_contact_ids: Optional[List[int]]
    sharing_active: bool
    expected_arrival: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    expires_at: Optional[datetime]
