import { useState } from "react";
import { Alert, Button, Card, Empty, inputCls, Spinner, StatusBadge } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useGeolocation } from "../hooks/useGeolocation";
import { api, ApiError } from "../services/api";
import type { Facility } from "../types/api";
import { CITIES, km } from "../utils/format";

const KINDS = [["", "All"], ["police", "Police"], ["hospital", "Hospitals"], ["safe_point", "Assistance points"]];

export default function Facilities() {
  const { user } = useAuth();
  const geo = useGeolocation();
  const [items, setItems] = useState<Facility[] | null>(null);
  const [kind, setKind] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [where, setWhere] = useState<[number, number] | null>(null);

  const load = async (lat: number, lon: number, k = kind) => {
    setBusy(true); setErr(null); setWhere([lat, lon]);
    try { setItems(await api.facilities(lat, lon, 5000, k || undefined)); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Something went wrong."); }
    finally { setBusy(false); }
  };
  const here = async () => {
    if (user?.location_permission === "never") { setErr("Location use is turned off in your privacy settings. Choose a city instead."); return; }
    const p = await geo.locate(); if (p) load(p.lat, p.lon);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <h1 className="text-lg font-semibold">Nearby facilities</h1>
        <p className="mt-1 text-sm text-slate-600">Emergency service locations and available assistance points. Listing here is not a guarantee of safety or response time.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={here} disabled={geo.busy}>{geo.busy ? "Locating…" : "Use my location"}</Button>
          <select aria-label="City" className={`${inputCls} w-auto`} value="" onChange={(e) => { const c = CITIES.find((x) => x.name === e.target.value); if (c) load(c.lat, c.lon); }}>
            <option value="">Choose a city centre…</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
          <select aria-label="Type" className={`${inputCls} w-auto`} value={kind} onChange={(e) => { setKind(e.target.value); if (where) load(where[0], where[1], e.target.value); }}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {geo.error && <div className="mt-2"><Alert tone="warn">{geo.error}</Alert></div>}
        {err && <div className="mt-2"><Alert>{err}</Alert></div>}
      </Card>
      {busy && <Spinner />}
      {items && !busy && (items.length === 0
        ? <Empty title="No verified or demo records found within 5 km">Data may be unavailable for this area. In an emergency call 112.</Empty>
        : <ul className="space-y-3">{items.map((f) => (
          <li key={`${f.kind}-${f.id}`}><Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="font-semibold">{f.name}</h2><p className="text-sm text-slate-600">{f.label} · {km(f.distance_m)} away</p></div>
              <StatusBadge status={f.verification_status} />
            </div>
            <dl className="mt-2 grid gap-x-6 text-xs text-slate-600 sm:grid-cols-2">
              <div>Source: {f.source ?? "Not recorded"}</div><div>Owner: {f.data_owner ?? "Not recorded"}</div>
              <div>Hours: {f.operating_hours ?? "Not verified"}</div><div>Last updated: {f.freshness_days === null ? "Unknown" : `${f.freshness_days} day(s) ago`}</div>
            </dl>
            <a className="mt-2 inline-block text-sm font-semibold text-brand-700 underline" target="_blank" rel="noreferrer"
              href={`https://www.openstreetmap.org/directions?to=${f.latitude}%2C${f.longitude}`}>Directions (opens OpenStreetMap)</a>
          </Card></li>))}</ul>)}
    </div>
  );
}
