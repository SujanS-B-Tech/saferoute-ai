"""SQLAlchemy models.

Geometry note: coordinates are stored as plain latitude/longitude floats with
indexes so the app runs on SQLite. For PostGIS, add a `geom geography(Point,4326)`
column (GeoAlchemy2) populated from lat/lon, index it with GiST, and swap the
haversine bounding-box query in `services/geo_queries.py` for ST_DWithin.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer,
                        String, Text)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    DATA_MODERATOR = "data_moderator"
    PARTNER = "authorized_partner"
    USER = "standard_user"


class VerificationStatus(str, enum.Enum):
    VERIFIED = "verified"
    ESTIMATED = "estimated"
    USER_REPORTED = "user_reported"
    SIMULATED = "simulated"
    UNAVAILABLE = "unavailable"


class PrivacyClass(str, enum.Enum):
    PUBLIC = "public"
    RESTRICTED = "restricted"      # never returned with exact coordinates to ordinary users
    CONFIDENTIAL = "confidential"  # admin/authorized only


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class GeoRecordMixin(TimestampMixin):
    """Provenance + geography shared by every safety-relevant record."""
    latitude: Mapped[float] = mapped_column(Float, index=True)
    longitude: Mapped[float] = mapped_column(Float, index=True)
    district: Mapped[str | None] = mapped_column(String(80), index=True)
    city: Mapped[str | None] = mapped_column(String(80), index=True)
    locality: Mapped[str | None] = mapped_column(String(120))
    source_id: Mapped[int | None] = mapped_column(ForeignKey("safety_data_sources.id"))
    verification_status: Mapped[str] = mapped_column(String(20), default=VerificationStatus.UNAVAILABLE.value)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)  # 0..1
    data_owner: Mapped[str | None] = mapped_column(String(120))
    privacy_class: Mapped[str] = mapped_column(String(20), default=PrivacyClass.PUBLIC.value)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default=Role.USER.value)
    preferred_language: Mapped[str] = mapped_column(String(5), default="en")
    location_permission: Mapped[str] = mapped_column(String(20), default="while_using")  # never|while_using|journey_only
    location_history_days: Mapped[int] = mapped_column(Integer, default=0)  # 0 = do not retain
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    contacts: Mapped[list["EmergencyContact"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class EmergencyContact(Base, TimestampMixin):
    __tablename__ = "emergency_contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    relationship_label: Mapped[str | None] = mapped_column(String(40))
    can_receive_live_location: Mapped[bool] = mapped_column(Boolean, default=False)  # explicit consent
    user: Mapped[User] = relationship(back_populates="contacts")


class SafetyDataSource(Base, TimestampMixin):
    __tablename__ = "safety_data_sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    factor: Mapped[str] = mapped_column(String(40), index=True)  # cctv, lighting, police, patrol...
    source_type: Mapped[str] = mapped_column(String(40))  # government, osm, partner, community, simulated
    verification_status: Mapped[str] = mapped_column(String(20))
    owner: Mapped[str | None] = mapped_column(String(120))
    coverage: Mapped[str | None] = mapped_column(String(200))
    limitations: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PoliceStation(Base, GeoRecordMixin):
    __tablename__ = "police_stations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    is_all_women: Mapped[bool] = mapped_column(Boolean, default=False)
    contact_phone: Mapped[str | None] = mapped_column(String(30))
    operating_hours: Mapped[str | None] = mapped_column(String(80))


class EmergencyFacility(Base, GeoRecordMixin):
    __tablename__ = "emergency_facilities"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    facility_type: Mapped[str] = mapped_column(String(40), index=True)  # hospital, fire, ambulance
    contact_phone: Mapped[str | None] = mapped_column(String(30))
    operating_hours: Mapped[str | None] = mapped_column(String(80))


class SafePoint(Base, GeoRecordMixin):
    __tablename__ = "safe_points"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(40), index=True)  # railway_station, bus_terminal, government, partner
    operating_hours: Mapped[str | None] = mapped_column(String(80))


class CCTVRecord(Base, GeoRecordMixin):
    """Sensitive. Default privacy is RESTRICTED: the public API returns only aggregate coverage."""
    __tablename__ = "cctv_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    coverage_radius_m: Mapped[float] = mapped_column(Float, default=30.0)
    operator: Mapped[str | None] = mapped_column(String(120))


class PatrolInformation(Base, TimestampMixin):
    """Area-level, time-bounded patrol data from an authorized partner only. Never live GPS of officers."""
    __tablename__ = "patrol_information"
    id: Mapped[int] = mapped_column(primary_key=True)
    district: Mapped[str] = mapped_column(String(80), index=True)
    area_label: Mapped[str] = mapped_column(String(160))
    source_id: Mapped[int | None] = mapped_column(ForeignKey("safety_data_sources.id"))
    verification_status: Mapped[str] = mapped_column(String(20), default=VerificationStatus.UNAVAILABLE.value)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    privacy_class: Mapped[str] = mapped_column(String(20), default=PrivacyClass.CONFIDENTIAL.value)


class SafetyIndicator(Base, GeoRecordMixin):
    """Point-level evidence for street lighting, public activity, isolation, etc."""
    __tablename__ = "safety_indicators"
    id: Mapped[int] = mapped_column(primary_key=True)
    indicator_type: Mapped[str] = mapped_column(String(40), index=True)
    value: Mapped[float] = mapped_column(Float)  # 0..1 normalised support for the factor
    detail: Mapped[str | None] = mapped_column(String(255))


class Route(Base, TimestampMixin):
    __tablename__ = "routes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    travel_mode: Mapped[str] = mapped_column(String(20))
    distance_m: Mapped[float] = mapped_column(Float)
    duration_s: Mapped[float] = mapped_column(Float)
    geometry: Mapped[list] = mapped_column(JSON)  # [[lat, lon], ...]
    assessment: Mapped[dict | None] = mapped_column(JSON)
    is_simulated_geometry: Mapped[bool] = mapped_column(Boolean, default=False)
    segments: Mapped[list["RouteSegment"]] = relationship(back_populates="route", cascade="all, delete-orphan")


class RouteSegment(Base):
    __tablename__ = "route_segments"
    id: Mapped[int] = mapped_column(primary_key=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id"), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    length_m: Mapped[float] = mapped_column(Float)
    geometry: Mapped[list] = mapped_column(JSON)
    evidence: Mapped[list | None] = mapped_column(JSON)
    route: Mapped[Route] = relationship(back_populates="segments")


class Journey(Base, TimestampMixin):
    __tablename__ = "journeys"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    route_id: Mapped[int | None] = mapped_column(ForeignKey("routes.id"))
    origin_label: Mapped[str] = mapped_column(String(200))
    destination_label: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="planned")  # planned|active|completed|cancelled|expired
    share_with_contact_ids: Mapped[list | None] = mapped_column(JSON)
    sharing_active: Mapped[bool] = mapped_column(Boolean, default=False)
    expected_arrival: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CommunityReport(Base, TimestampMixin):
    __tablename__ = "community_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    latitude: Mapped[float] = mapped_column(Float, index=True)
    longitude: Mapped[float] = mapped_column(Float, index=True)
    description: Mapped[str] = mapped_column(Text)
    photo_ref: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|approved|rejected
    duplicate_of: Mapped[int | None] = mapped_column(ForeignKey("community_reports.id"))
    moderator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    moderation_note: Mapped[str | None] = mapped_column(String(255))


class EmergencyAlert(Base, TimestampMixin):
    __tablename__ = "emergency_alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=True)  # no authorized dispatch integration exists
    notified_contact_ids: Mapped[list | None] = mapped_column(JSON)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity: Mapped[str | None] = mapped_column(String(60))
    entity_id: Mapped[str | None] = mapped_column(String(40))
    detail: Mapped[dict | None] = mapped_column(JSON)


Index("ix_reports_geo_status", CommunityReport.latitude, CommunityReport.longitude, CommunityReport.status)
