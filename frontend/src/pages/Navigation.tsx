import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import RouteMap from "../components/RouteMap";
import { Alert, Card, Spinner, Button } from "../components/ui";
import { api, ApiError } from "../services/api";
import type { Journey, LatLon } from "../types/api";

export default function Navigation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mockDeviation, setMockDeviation] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.journey(parseInt(id, 10))
      .then(setJourney)
      .catch((e) => setErr(e.message));
  }, [id]);

  const startJourney = async () => {
    if (!journey) return;
    setBusy(true); setErr(null);
    try {
      const j = await api.startJourney(journey.id);
      setJourney(j);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong.");
    } finally { setBusy(false); }
  };

  const endJourney = async () => {
    if (!journey) return;
    setBusy(true); setErr(null);
    try {
      const j = await api.endJourney(journey.id);
      setJourney(j);
      setMockDeviation(false);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong.");
    } finally { setBusy(false); }
  };

  if (err) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert variant="error">{err}</Alert>
        <Button className="mt-4" onClick={() => navigate("/app/journeys")}>Back to Journeys</Button>
      </div>
    );
  }

  if (!journey) {
    return <div className="p-10"><Spinner label="Loading journey..." /></div>;
  }

  // Without a stored route geometry, we'll just track A -> B conceptually for the prototype.
  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <div className="space-y-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
        <Card>
          <h1 className="mb-2 text-lg font-semibold">Active Journey</h1>
          
          <div className="mb-4">
            <p className="text-sm text-slate-500">From:</p>
            <p className="font-medium text-slate-800">{journey.origin_label}</p>
            <div className="my-1 border-l-2 border-slate-200 ml-1.5 h-3"></div>
            <p className="text-sm text-slate-500">To:</p>
            <p className="font-medium text-slate-800">{journey.destination_label}</p>
          </div>

          <div className="mb-4 space-y-2">
            <p className="text-sm flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className="font-semibold capitalize">{journey.status}</span>
            </p>
            {journey.started_at && <p className="text-sm text-slate-500">Started: {new Date(journey.started_at).toLocaleTimeString()}</p>}
            {journey.expected_arrival && <p className="text-sm text-slate-500">ETA: {new Date(journey.expected_arrival).toLocaleTimeString()}</p>}
          </div>

          {!journey.started_at && journey.status === "planned" && (
            <Button variant="primary" className="w-full" onClick={startJourney} disabled={busy}>
              {busy ? "Starting..." : "Start Journey"}
            </Button>
          )}

          {journey.status === "active" && (
            <div className="space-y-3">
              <Button variant="primary" className="w-full" onClick={endJourney} disabled={busy}>
                {busy ? "Ending..." : "Arrived - End Journey"}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setMockDeviation(true)}>
                (Mock) Trigger Route Deviation
              </Button>
            </div>
          )}

          {journey.sharing_active && (
            <div className="mt-4 p-3 bg-brand-50 rounded text-brand-800 text-sm border border-brand-200">
              <span className="font-semibold block mb-1">MOCK WORKFLOW</span>
              Live location sharing is active in memory. SMS notifications will not be sent until a provider is configured.
            </div>
          )}
        </Card>

        {mockDeviation && (
          <Card className="border-orange-300 bg-orange-50">
            <h2 className="font-semibold text-orange-800 mb-2">Route Deviation Detected</h2>
            <p className="text-sm text-orange-900 mb-4">You have moved away from your planned route. Would you like to recalculate?</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setMockDeviation(false)}>Recalculate</Button>
              <Button variant="secondary" onClick={() => setMockDeviation(false)}>Continue</Button>
            </div>
          </Card>
        )}
      </div>

      <div className="flex min-h-[420px] flex-col gap-2 lg:h-[calc(100vh-9rem)]">
         <div className="bg-slate-100 h-full w-full rounded flex items-center justify-center border border-slate-200 shadow-inner">
             {/* Note: The full RouteMap is omitted here as it requires geometry loading from the specific Plan. 
                 For this prototype phase, this is a conceptual live map placeholder since live GPS/navigation UI 
                 would typically rely on the leaflet turn-by-turn plugin which isn't configured here yet.
             */}
             <div className="text-center p-6 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="font-semibold block mb-1">Live Map View (Simulation)</p>
                <p className="text-sm max-w-sm mx-auto">In a full deployment, this view displays your live GPS dot moving along the selected route line.</p>
             </div>
         </div>
      </div>
    </div>
  );
}
