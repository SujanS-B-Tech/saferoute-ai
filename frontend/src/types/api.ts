export type EvidenceStatus = "verified" | "estimated" | "user_reported" | "simulated" | "unavailable";
export type TravelMode = "walking" | "two_wheeler" | "car" | "public_transport";
export type Preference = "balanced" | "safety_priority" | "accessibility_priority";
export type LatLon = [number, number];

export interface User {
  id: number; name: string; email: string; phone: string | null; role: string;
  preferred_language: "en" | "ta"; location_permission: "never" | "while_using" | "journey_only";
  location_history_days: number;
}
export interface Contact {
  id: number; name: string; phone: string; relationship_label: string | null; can_receive_live_location: boolean;
}
export interface FactorSummary {
  factor: string; label: string; status: EvidenceStatus; coverage: number; value: number | null;
  confidence: number; freshest: string | null; message: string; sources: string[];
}
export interface RouteResult {
  route_id: string; distance_m: number; duration_s: number; model_score: number | null;
  data_confidence: "insufficient" | "low" | "moderate" | "high"; data_confidence_value: number;
  summary: string; factors: FactorSummary[]; context_notes: string[]; contains_simulated_data: boolean;
  safety_guarantee: false; disclaimer: string; methodology: string; geometry: LatLon[];
}
export interface PlanResponse {
  demo_banner: string | null; routing_provider: string; geometry_simulated: boolean;
  preference: Preference; guidance: string; routes: RouteResult[];
}
export interface Facility {
  id: number; kind: "police" | "hospital" | "safe_point"; name: string; category: string | null;
  latitude: number; longitude: number; distance_m: number; contact_phone: string | null;
  operating_hours: string | null; verification_status: EvidenceStatus; source: string | null;
  data_owner: string | null; freshness_days: number | null; label: string;
}
export interface DataSource {
  factor: string; label: string; status: EvidenceStatus; source_type: string | null; owner: string | null;
  coverage: string | null; limitations: string | null; confidence: number; last_updated: string | null;
  message: string | null;
}
export interface Health { status: string; demo_mode: boolean; demo_banner: string | null }

export interface Journey {
  id: number;
  route_id: number | null;
  origin_label: string;
  destination_label: string;
  status: "planned" | "active" | "completed" | "cancelled" | "expired";
  share_with_contact_ids: number[] | null;
  sharing_active: boolean;
  expected_arrival: string | null;
  started_at: string | null;
  ended_at: string | null;
  expires_at: string | null;
}

export interface EmergencyAlert {
  id: number;
  user_id: number;
  status: "draft" | "activated" | "contact_notification_attempted" | "closed" | "cancelled";
  latitude: number | null;
  longitude: number | null;
  is_mock: boolean;
  notified_contact_ids: number[] | null;
  created_at: string;
  closed_at: string | null;
}

export interface Report {
  id: number;
  category: string;
  latitude: number;
  longitude: number;
  description: string;
  photo_ref: string | null;
  status: "pending" | "approved" | "rejected";
  duplicate_of: number | null;
  created_at: string;
  updated_at: string;
}

