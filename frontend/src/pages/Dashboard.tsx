import { useEffect, useState } from "react";
import RouteCard from "../components/RouteCard";
import RouteMap from "../components/RouteMap";
import { Alert, Button, Card, Empty, Field, inputCls, Spinner } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useGeolocation } from "../hooks/useGeolocation";
import { api, ApiError } from "../services/api";
import type { Facility, LatLon, PlanResponse, Preference, TravelMode } from "../types/api";
import { CITIES } from "../utils/format";

const MODES: [TravelMode, string][] = [["walking", "Walking"], ["two_wheeler", "Two-wheeler"], ["car", "Car"], ["public_transport", "Public transport"]];
const PREFS: [Preference, string][] = [["balanced", "Balanced"], ["safety_priority", "Safety-data priority"], ["accessibility_priority", "Accessibility priority"]];
const fmt = (p: LatLon | null) => (p ? `${p[0].toFixed(4)}, ${p[1].toFixed(4)}` : "Not set");

export default function Dashboard() {
  const { user } = useAuth();
  const geo = useGeolocation();
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [dest, setDest] = useState<LatLon | null>(null);
  const [picking, setPicking] = useState<"origin" | "destination" | null>("origin");
  const [mode, setMode] = useState<TravelMode>("walking");
  const [pref, setPref] = useState<Preference>("balanced");
  const [when, setWhen] = useState<"now" | "scheduled">("now");
  const [at, setAt] = useState("");
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fac, setFac] = useState<Facility[]>([]);
  const [showFac, setShowFac] = useState(true);

  useEffect(() => {
    if (!origin) return;
    api.facilities(origin[0], origin[1], 4000).then(setFac).catch(() => setFac([]));
  }, [origin]);

  const pick = (p: LatLon) => {
    if (!picking) return;
    if (picking === "origin") { setOrigin(p); setPicking("destination"); } else { setDest(p); setPicking(null); }
    setPlan(null);
  };
  const useMyLocation = async () => {
    if (user?.location_permission === "never") { setErr("Location use is turned off in your privacy settings. Pick a point on the map instead."); return; }
    const p = await geo.locate();
    if (p) { setOrigin([p.lat, p.lon]); setPicking("destination"); setPlan(null); }
  };
  const city = (name: string, which: "origin" | "destination") => {
    const c = CITIES.find((x) => x.name === name); if (!c) return;
    which === "origin" ? setOrigin([c.lat, c.lon]) : setDest([c.lat + 0.012, c.lon + 0.012]);
    setPlan(null);
  };

  const submit = async () => {
    if (!origin || !dest) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.planRoute({
        origin: { lat: origin[0], lon: origin[1] }, destination: { lat: dest[0], lon: dest[1] }, mode, preference: pref,
        departure_time: when === "scheduled" && at ? new Date(at).toISOString() : undefined,
      });
      setPlan(r); setSel(0);
    } catch (x) {
      setErr(x instanceof ApiError ? (x.status === 502 ? `The routing service is unavailable right now. ${x.message}` : x.status === 429 ? "Too many requests. Please wait a moment." : x.message) : "Something went wrong.");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <div className="space-y-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
        <Card>
          <h1 className="mb-3 text-lg font-semibold">Plan a journey</h1>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700"><span>From</span><span className="font-normal text-slate-500">{fmt(origin)}</span></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={useMyLocation} disabled={geo.busy}>{geo.busy ? "Locating…" : "Use current location"}</Button>
                <Button variant={picking === "origin" ? "primary" : "secondary"} onClick={() => setPicking("origin")}>Pick on map</Button>
                <select aria-label="Choose starting city" className={`${inputCls} w-auto`} value="" onChange={(e) => city(e.target.value, "origin")}>
                  <option value="">City centre…</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>
              {geo.error && <div className="mt-2"><Alert tone="warn">{geo.error}</Alert></div>}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700"><span>To</span><span className="font-normal text-slate-500">{fmt(dest)}</span></div>
              <div className="flex flex-wrap gap-2">
                <Button variant={picking === "destination" ? "primary" : "secondary"} onClick={() => setPicking("destination")}>Pick on map</Button>
                <select aria-label="Choose destination city" className={`${inputCls} w-auto`} value="" onChange={(e) => city(e.target.value, "destination")}>
                  <option value="">Near city centre…</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>
              <p className="mt-1 text-xs text-slate-500">Tip: click the map to place points. Address search will be added via a backend geocoder.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Travel mode"><select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as TravelMode)}>{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Preference"><select className={inputCls} value={pref} onChange={(e) => setPref(e.target.value as Preference)}>{PREFS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departure"><select className={inputCls} value={when} onChange={(e) => setWhen(e.target.value as "now" | "scheduled")}><option value="now">Now</option><option value="scheduled">Scheduled</option></select></Field>
              {when === "scheduled" && <Field label="Date & time"><input type="datetime-local" className={inputCls} value={at} onChange={(e) => setAt(e.target.value)} /></Field>}
            </div>
            {pref === "accessibility_priority" && <Alert tone="info">Road-accessibility data isn't available yet, so this option currently prefers more direct routes.</Alert>}
            <Button className="w-full" disabled={!origin || !dest || busy || (when === "scheduled" && !at)} onClick={submit}>{busy ? "Analysing routes…" : "Find safe routes"}</Button>
            {err && <Alert>{err}</Alert>}
          </div>
        </Card>

        <div aria-live="polite" className="space-y-3">
          {busy && <Spinner label="Comparing route alternatives" />}
          {plan && (
            <>
              <Alert tone="info">{plan.guidance}{plan.geometry_simulated && " Route geometry is simulated (not real roads) in this demo."}</Alert>
              {plan.routes.map((r, i) => <RouteCard key={r.route_id} route={r} index={i} selected={i === sel} onSelect={() => setSel(i)} />)}
            </>
          )}
          {!plan && !busy && <Empty title="No routes yet">Set a start and destination, then choose “Find safe routes”.</Empty>}
        </div>
      </div>

      <div className="flex min-h-[420px] flex-col gap-2 lg:h-[calc(100vh-9rem)]">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showFac} onChange={(e) => setShowFac(e.target.checked)} className="h-4 w-4" /> Show nearby services ({fac.length})</label>
        <div className="min-h-0 flex-1">
          <RouteMap origin={origin} destination={dest} routes={plan?.routes ?? []} selected={sel} onSelect={setSel} facilities={fac} showFacilities={showFac} onPick={pick} picking={picking} />
        </div>
      </div>
    </div>
  );
}
