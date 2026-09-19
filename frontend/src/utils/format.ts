import type { EvidenceStatus } from "../types/api";

export const km = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
export const mins = (s: number) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);

export const STATUS_LABEL: Record<EvidenceStatus, string> = {
  verified: "Verified", estimated: "Estimated", user_reported: "User-reported",
  simulated: "Simulated demo data", unavailable: "Data unavailable",
};

export const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: "Coimbatore", lat: 11.0168, lon: 76.9558 }, { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Madurai", lat: 9.9252, lon: 78.1198 }, { name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047 },
  { name: "Salem", lat: 11.6643, lon: 78.146 }, { name: "Tiruppur", lat: 11.1085, lon: 77.3411 },
  { name: "Erode", lat: 11.341, lon: 77.7172 }, { name: "Vellore", lat: 12.9165, lon: 79.1325 },
  { name: "Tirunelveli", lat: 8.7139, lon: 77.7567 }, { name: "Thoothukudi", lat: 8.7642, lon: 78.1348 },
  { name: "Thanjavur", lat: 10.787, lon: 79.1378 }, { name: "Dindigul", lat: 10.3673, lon: 77.9803 },
  { name: "Hosur", lat: 12.7409, lon: 77.8253 }, { name: "Ooty", lat: 11.4102, lon: 76.695 },
];
