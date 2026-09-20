import type { Contact, DataSource, Facility, Health, PlanResponse, Preference, TravelMode, User, Journey, EmergencyAlert, Report } from "../types/api";

const BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "saferoute.token"; // sessionStorage: cleared when the tab closes

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const d = body?.detail;
    const msg = Array.isArray(d) ? d.map((e: { msg: string }) => e.msg).join("; ") : d ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

const post = <T,>(p: string, b?: unknown) => request<T>(p, { method: "POST", body: b ? JSON.stringify(b) : undefined });

export const api = {
  health: () => request<Health>("/health"),
  register: (b: { name: string; email: string; password: string; phone?: string; preferred_language: "en" | "ta" }) =>
    post<User>("/auth/register", b),
  login: (email: string, password: string) => post<{ access_token: string }>("/auth/login", { email, password }),
  logout: () => post<void>("/auth/logout"),
  me: () => request<User>("/users/me"),
  updatePrivacy: (b: Partial<Pick<User, "preferred_language" | "location_permission" | "location_history_days">>) =>
    request<User>("/users/me/privacy", { method: "PATCH", body: JSON.stringify(b) }),
  contacts: () => request<Contact[]>("/users/me/contacts"),
  addContact: (b: Omit<Contact, "id">) => post<Contact>("/users/me/contacts", b),
  deleteContact: (id: number) => request<void>(`/users/me/contacts/${id}`, { method: "DELETE" }),
  planRoute: (b: {
    origin: { lat: number; lon: number }; destination: { lat: number; lon: number };
    mode: TravelMode; preference: Preference; departure_time?: string;
  }) => post<PlanResponse>("/routes/plan", b),
  facilities: (lat: number, lon: number, radius_m = 3000, kind?: string) =>
    request<Facility[]>(`/facilities/nearby?lat=${lat}&lon=${lon}&radius_m=${radius_m}${kind ? `&kind=${kind}` : ""}`),
  sources: () => request<DataSource[]>("/safety/sources"),
  journeys: () => request<Journey[]>("/journeys"),
  journey: (id: number) => request<Journey>(`/journeys/${id}`),
  createJourney: (b: { route_id?: number | null; origin_label: string; destination_label: string; expected_arrival?: string | null; share_with_contact_ids?: number[] | null }) =>
    post<Journey>("/journeys", b),
  startJourney: (id: number) => post<Journey>(`/journeys/${id}/start`),
  endJourney: (id: number) => post<Journey>(`/journeys/${id}/end`),
  createAlert: (b: { latitude: number | null; longitude: number | null; status?: string }) => post<EmergencyAlert>("/emergency/alerts", b),
  getAlert: (id: number) => request<EmergencyAlert>(`/emergency/alerts/${id}`),
  activateAlert: (id: number) => post<EmergencyAlert>(`/emergency/alerts/${id}/activate`),
  closeAlert: (id: number) => post<EmergencyAlert>(`/emergency/alerts/${id}/close`),
  createReport: (b: { category: string; latitude: number; longitude: number; description: string; photo_ref?: string | null }) => post<Report>("/reports", b),
  myReports: () => request<Report[]>("/reports/me"),
  getPendingReports: () => request<Report[]>("/admin/reports/pending"),
  moderateReport: (id: number, b: { status: "approved" | "rejected"; note?: string }) => 
    request<Report>(`/admin/reports/${id}/moderate`, { method: "PATCH", body: JSON.stringify(b), headers: { "Content-Type": "application/json" } }),
  deployOverride: (b: { latitude: number; longitude: number; severity_label: string; radius_m?: number }) => post<{message:string}>("/admin/override", b),
};
