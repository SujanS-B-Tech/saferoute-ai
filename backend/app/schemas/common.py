from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

TravelMode = Literal["walking", "two_wheeler", "car", "public_transport"]
Preference = Literal["balanced", "safety_priority", "accessibility_priority"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9 \-]{7,15}$")
    preferred_language: Literal["en", "ta"] = "en"

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        return " ".join(v.split())


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    phone: str | None
    role: str
    preferred_language: str
    location_permission: str
    location_history_days: int


class PrivacyIn(BaseModel):
    preferred_language: Literal["en", "ta"] | None = None
    location_permission: Literal["never", "while_using", "journey_only"] | None = None
    location_history_days: int | None = Field(default=None, ge=0, le=30)


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\+?[0-9 \-]{7,15}$")
    relationship_label: str | None = Field(default=None, max_length=40)
    can_receive_live_location: bool = False


class ContactOut(ContactIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class LatLonIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    label: str | None = Field(default=None, max_length=200)


class PlanRouteIn(BaseModel):
    origin: LatLonIn
    destination: LatLonIn
    mode: TravelMode = "walking"
    departure_time: datetime | None = None  # None = now
    preference: Preference = "balanced"


class FacilityOut(BaseModel):
    id: int
    kind: str
    name: str
    category: str | None = None
    latitude: float
    longitude: float
    distance_m: int
    contact_phone: str | None = None
    operating_hours: str | None = None
    verification_status: str
    source: str | None = None
    data_owner: str | None = None
    freshness_days: int | None = None
    label: str  # wording rule: never "guaranteed safe"
