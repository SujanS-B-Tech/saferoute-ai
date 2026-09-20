import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Field, inputCls, Spinner } from "../components/ui";
import { api, ApiError } from "../services/api";
import type { Report } from "../types/api";
import { useGeolocation } from "../hooks/useGeolocation";

export default function Admin() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const geo = useGeolocation();

  // Override Form State
  const [oLat, setOLat] = useState("");
  const [oLon, setOLon] = useState("");
  const [oSeverity, setOSeverity] = useState("admin_override");
  const [oMsg, setOMsg] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    api.getPendingReports().then((res) => setReports(res)).catch(e => setErr(e.message));
  };

  const moderate = async (id: number, status: "approved" | "rejected") => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await api.moderateReport(id, { status });
      setReports((prev: Report[] | null) => prev?.filter((r: Report) => r.id !== id) || null);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Failed to moderate report");
    } finally {
      setBusy(false);
    }
  };

  const useLoc = async () => {
    const loc = await geo.locate();
    if (loc) {
      setOLat(loc.lat.toString());
      setOLon(loc.lon.toString());
    }
  };

  const deployOverride = async () => {
    const lat = parseFloat(oLat);
    const lon = parseFloat(oLon);
    if (isNaN(lat) || isNaN(lon)) {
      setErr("Invalid latitude or longitude.");
      return;
    }
    setBusy(true); setErr(null); setOMsg(null);
    try {
      const res = await api.deployOverride({ latitude: lat, longitude: lon, severity_label: oSeverity });
      setOMsg(res.message);
      setOLat(""); setOLon("");
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Failed to deploy override.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Moderation Queue - Takes up 2 columns on large screens */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center bg-white p-4 shadow-sm border border-slate-200 rounded-lg">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">Review pending community reports & engine overrides.</p>
          </div>
          <div className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded">
            System Node: Active
          </div>
        </div>

        <h2 className="text-xl font-bold mt-4">Moderation Queue</h2>
        {err && <Alert variant="error">{err}</Alert>}
        
        {!reports && !err && <Spinner label="Loading pending reports..." />}
        
        {reports?.length === 0 && (
          <Empty title="Queue Empty">
            No pending community reports require moderation.
          </Empty>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {reports?.map((r: Report) => (
            <Card key={r.id}>
              <div className="flex justify-between border-b pb-2 mb-2">
                <h3 className="font-bold text-slate-800 capitalize leading-tight">
                  {r.category.replace(/_/g, " ")}
                </h3>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-semibold h-fit">
                  PENDING
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.description}</p>
              
              <div className="mt-2 space-y-1">
                <div className="text-xs text-slate-500 font-mono bg-slate-50 p-1 rounded">Loc: {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</div>
                <div className="text-xs text-slate-500">Submitted: {new Date(r.created_at).toLocaleString()}</div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100" onClick={() => moderate(r.id, "rejected")} disabled={busy}>
                  Reject
                </Button>
                <Button variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-700" onClick={() => moderate(r.id, "approved")} disabled={busy}>
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Manual Override Control Panel */}
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50/50">
          <h2 className="font-bold text-red-800 text-lg mb-2 flex items-center gap-2">
             ⚠️ Engine Overrides
          </h2>
          <p className="text-sm text-slate-700 mb-6">
            Force-deploy a safety indicator (absolute severity) directly into the routing engine to redirect flows organically around a severe temporary threat.
          </p>

          <div className="space-y-3">
             <Field label="Severity/Type Label">
               <input type="text" className={inputCls} value={oSeverity} onChange={e => setOSeverity(e.target.value)} />
             </Field>
             <div className="grid grid-cols-2 gap-2">
               <Field label="Latitude">
                 <input type="number" step="any" className={inputCls} placeholder="e.g. 13.0827" value={oLat} onChange={e => setOLat(e.target.value)} />
               </Field>
               <Field label="Longitude">
                 <input type="number" step="any" className={inputCls} placeholder="e.g. 80.2707" value={oLon} onChange={e => setOLon(e.target.value)} />
               </Field>
             </div>
             
             <button onClick={useLoc} className="text-xs font-semibold text-brand-600 hover:underline" disabled={geo.busy}>
               {geo.busy ? "Locating..." : "Use my current location"}
             </button>

             {oMsg && <Alert variant="info" className="mt-3 bg-emerald-100 text-emerald-800 border-emerald-300">{oMsg}</Alert>}
             
             <Button variant="primary" className="w-full mt-4 bg-red-600 hover:bg-red-700 border-red-700" onClick={deployOverride} disabled={busy || !oLat || !oLon}>
               Deploy Global Override
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
