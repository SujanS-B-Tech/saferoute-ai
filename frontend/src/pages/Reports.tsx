import { useEffect, useState, FormEvent } from "react";
import { Alert, Button, Card, Empty, Field, inputCls, Spinner } from "../components/ui";
import { useGeolocation } from "../hooks/useGeolocation";
import { api, ApiError } from "../services/api";
import type { Report, LatLon } from "../types/api";

const CATEGORIES = [
  "broken_streetlight",
  "obstruction",
  "unsafe_infrastructure",
  "missing_facility",
  "other"
];

const formatCategory = (c: string) => c.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function Reports() {
  const geo = useGeolocation();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LatLon | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    api.myReports().then(setReports).catch((e: any) => setErr(e.message));
  };

  const useMyLocation = async () => {
    const p = await geo.locate();
    if (p) setLocation([p.lat, p.lon]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!location) {
      setErr("Please provide a location for the report.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      const r = await api.createReport({
        category,
        latitude: location[0],
        longitude: location[1],
        description
      });
      setReports((prev: Report[] | null) => [r, ...(prev || [])]);
      setDescription("");
      setLocation(null);
    } catch (x: any) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong submitting report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <div className="space-y-4">
        <Card>
          <h1 className="mb-2 text-lg font-semibold">Submit a Community Report</h1>
          <p className="text-sm text-slate-600 mb-4">
            Help improve community safety by reporting issues. Approved reports help the routing engine avoid unsafe areas.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Category">
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            </Field>

            <Field label="Description">
              <textarea 
                required
                className={inputCls} 
                rows={3} 
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue... (e.g. Streetlight is completely broken on the corner)"
              />
            </Field>

            <div>
               <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Location</span>
                  <span className="font-normal text-slate-500">
                    {location ? `${location[0].toFixed(4)}, ${location[1].toFixed(4)}` : "Not set"}
                  </span>
               </div>
               <Button type="button" variant="secondary" onClick={useMyLocation} disabled={geo.busy} className="w-full">
                  {geo.busy ? "Locating…" : "Use Current Location"}
               </Button>
               {geo.error && <div className="mt-2 text-sm text-red-600">{geo.error}</div>}
            </div>

            {err && <Alert variant="error">{err}</Alert>}

            <Button type="submit" disabled={busy || !location || description.trim() === ""} className="w-full">
              {busy ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Reports</h2>
        
        {!reports && !err && <Spinner label="Loading reports..." />}
        
        {reports?.length === 0 && (
          <Empty title="No reports yet">
            Reports you submit will appear here.
          </Empty>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {reports?.map(r => (
            <Card key={r.id} className="relative overflow-hidden">
               {r.duplicate_of && (
                 <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-bl-lg font-semibold">
                   Merged (Duplicate)
                 </div>
               )}
               <div className="flex justify-between items-start mb-2 mt-2">
                 <h3 className="font-bold text-slate-800">{formatCategory(r.category)}</h3>
                 <span className={`text-xs px-2 py-1 rounded font-medium ${
                   r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                   r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                   'bg-slate-100 text-slate-700'
                 }`}>
                   {r.status.toUpperCase()}
                 </span>
               </div>
               <p className="text-sm text-slate-700 mt-2 line-clamp-3">{r.description}</p>
               <div className="mt-4 text-xs text-slate-500">
                 {new Date(r.created_at).toLocaleString()}
               </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
