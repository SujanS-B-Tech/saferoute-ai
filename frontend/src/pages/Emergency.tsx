import { useState, useEffect } from "react";
import { Alert, Button, Card, Spinner } from "../components/ui";
import { api, ApiError } from "../services/api";
import { useGeolocation } from "../hooks/useGeolocation";
import type { EmergencyAlert, Facility } from "../types/api";

export default function Emergency() {
  const geo = useGeolocation();
  const [alertState, setAlertState] = useState<EmergencyAlert | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Once an alert is activated, try to fetch nearby facilities
  useEffect(() => {
    if (alertState?.latitude && alertState?.longitude) {
      // Fetch police and hospitals
      Promise.all([
        api.facilities(alertState.latitude, alertState.longitude, 5000, "police"),
        api.facilities(alertState.latitude, alertState.longitude, 5000, "hospital")
      ]).then(([police, hospitals]) => {
        setFacilities([...police, ...hospitals]);
      }).catch(console.error);
    }
  }, [alertState?.latitude, alertState?.longitude]);

  const activateSOS = async () => {
    setBusy(true); setErr(null);
    try {
      const pos = await geo.locate();
      const lat = pos ? pos.lat : null;
      const lon = pos ? pos.lon : null;

      // 1. Create the alert
      let alert = await api.createAlert({ latitude: lat, longitude: lon, status: "draft" });
      
      // 2. Immediately escalate to attempting to notify contacts
      alert = await api.activateAlert(alert.id);
      
      setAlertState(alert);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong activating SOS.");
    } finally {
      setBusy(false);
    }
  };

  const closeAlert = async () => {
    if (!alertState) return;
    setBusy(true);
    try {
      const closed = await api.closeAlert(alertState.id);
      setAlertState(closed);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong closing the alert.");
    } finally {
      setBusy(false);
    }
  };

  const cancelAlert = async () => {
    if (!alertState) return;
    setBusy(true);
    try {
      const cancelled = await api.cancelAlert(alertState.id);
      setAlertState(cancelled);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong cancelling the alert.");
    } finally {
      setBusy(false);
    }
  };

  const isClosed = alertState?.status === "closed" || alertState?.status === "cancelled";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {!alertState || isClosed ? (
        <Card className="text-center p-8 space-y-6">
          <h1 className="text-2xl font-bold text-slate-800">Emergency SOS</h1>
          <p className="text-slate-600">
            Slide or tap to immediately request help. We will attempt to notify your trusted contacts.
          </p>

          {err && <Alert variant="error">{err}</Alert>}
          {geo.error && <Alert variant="error">{geo.error}</Alert>}

          <div className="py-6">
            <button 
              onClick={activateSOS} 
              disabled={busy || geo.busy}
              className="group relative inline-flex h-48 w-48 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition transform"
              aria-label="Activate SOS"
            >
              {busy ? (
                <Spinner />
              ) : (
                <span className="text-3xl font-black uppercase tracking-wider">SOS</span>
              )}
              {/* Ripple effect rings */}
              {!busy && (
                 <>
                   <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-20"></span>
                   <span className="absolute inline-flex h-[135%] w-[135%] animate-pulse rounded-full bg-red-300 opacity-10 delay-150"></span>
                 </>
              )}
            </button>
          </div>

          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded text-sm text-left">
            <span className="font-bold">MOCK WORKFLOW</span>: This is a prototype system. Activating SOS will NOT automatically dispatch police or emergency services.
          </div>
          
          {isClosed && (
            <div className="mt-4 bg-slate-50 border border-slate-200 p-3 rounded text-slate-700 font-medium">
              Previous alert was {alertState.status}.
            </div>
          )}
        </Card>
      ) : (
        <Card className="border-red-200 shadow-lg shadow-red-50">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-red-700 animate-pulse">SOS ACTIVATED</h1>
                <p className="text-sm text-slate-600">Status: <span className="font-semibold">{alertState.status.replace(/_/g, ' ')}</span></p>
              </div>
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                MOCK WORKFLOW
              </div>
            </div>

            {err && <Alert variant="error">{err}</Alert>}

            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-900">
              <p className="font-semibold mb-2">Emergency Contacts Notification:</p>
              {alertState.notified_contact_ids?.length ? (
                <p>Notified {alertState.notified_contact_ids.length} contacts.</p>
              ) : (
                <p>No contacts configured or reachable.</p>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="font-semibold text-slate-800">Immediately call an authority:</h2>
              <a 
                href="tel:112" 
                className="block w-full rounded bg-red-100 py-4 text-center text-lg font-bold text-red-800 hover:bg-red-200 border border-red-300 transition"
              >
                📞 Dial 112 (National Emergency)
              </a>
            </div>

            <div className="space-y-3">
              <h2 className="font-semibold text-slate-800 mt-6">Nearest Useful Facilities:</h2>
              {!facilities.length ? (
                <p className="text-sm text-slate-500">Searching or none found nearby...</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {facilities.slice(0, 5).map(f => (
                     <li key={f.id} className="text-sm bg-slate-50 p-2 border border-slate-100 rounded flex justify-between items-center">
                        <div>
                          <strong className="block text-slate-700 capitalize">{f.kind}: {f.name}</strong>
                          <span className="text-slate-500">{Math.round(f.distance_m)}m away</span>
                        </div>
                        {f.contact_phone && (
                           <a href={`tel:${f.contact_phone}`} className="text-brand-600 border border-brand-200 px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 text-xs font-medium"> Call</a>
                        )}
                     </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-200 flex gap-3 mt-8">
               <Button variant="secondary" className="flex-1" onClick={cancelAlert} disabled={busy}>Cancel (False Alarm)</Button>
               <Button variant="primary" className="flex-1" onClick={closeAlert} disabled={busy}>I am Safe (Close)</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
