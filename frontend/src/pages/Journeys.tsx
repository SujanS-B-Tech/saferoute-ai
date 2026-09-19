import { useEffect, useState } from "react";
import { Alert, Card, Empty, Spinner, Button } from "../components/ui";
import { api, ApiError } from "../services/api";
import type { Journey } from "../types/api";

export default function Journeys() {
  const [items, setItems] = useState<Journey[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  useEffect(() => {
    api.journeys()
      .then(setItems)
      .catch((e) => setErr(e.message));
  }, []);

  const endJourney = async (id: number) => {
    setLoadingAction(id);
    try {
      const updated = await api.endJourney(id);
      setItems((prev) => prev?.map((j) => j.id === id ? updated : j) ?? null);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Something went wrong ending the journey.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Your Journeys</h1>
      <p className="text-sm text-slate-600">
        Review your past journeys and active location-sharing sessions.
      </p>

      {err && <Alert variant="error">{err}</Alert>}

      {!items && !err && <Spinner />}

      {items?.length === 0 && (
        <Empty title="No journeys yet">
          When you use navigation to find a safe route, your journeys will appear here.
        </Empty>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((j) => (
            <Card key={j.id}>
              <div className="flex flex-col h-full justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-800 line-clamp-1">{j.origin_label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      j.status === 'active' ? 'bg-brand-100 text-brand-700' :
                      j.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {j.status.charAt(0).toUpperCase() + j.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mb-2">to</div>
                  <h3 className="font-medium text-slate-800 line-clamp-1">{j.destination_label}</h3>
                  <div className="text-xs text-slate-500 mt-3 space-y-1">
                    {j.started_at && <p>Started: {new Date(j.started_at).toLocaleString()}</p>}
                    {j.sharing_active && j.share_with_contact_ids && (
                      <p className="text-brand-600 font-medium whitespace-break-spaces">
                        Live sharing active with {j.share_with_contact_ids.length} contact(s)
                      </p>
                    )}
                  </div>
                </div>
                {j.status === "active" && (
                  <div className="mt-2 text-right">
                    <Button 
                      variant="primary" 
                      onClick={() => endJourney(j.id)}
                      disabled={loadingAction === j.id}
                    >
                      {loadingAction === j.id ? "Ending..." : "End & Stop Sharing"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
