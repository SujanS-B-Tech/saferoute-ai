import { useState } from "react";
import { Alert, Button, Card, Field, inputCls } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { api, ApiError } from "../services/api";
import type { User } from "../types/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [lang, setLang] = useState(user!.preferred_language);
  const [perm, setPerm] = useState(user!.location_permission);
  const [days, setDays] = useState(user!.location_history_days);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setMsg(null);
    try { setUser(await api.updatePrivacy({ preferred_language: lang, location_permission: perm, location_history_days: days })); setMsg({ ok: true, text: "Settings saved." }); }
    catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? x.message : "Something went wrong." }); }
    finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <h1 className="text-lg font-semibold">Profile</h1>
        <dl className="mt-2 text-sm"><div><span className="text-slate-500">Name:</span> {user!.name}</div><div><span className="text-slate-500">Email:</span> {user!.email}</div>
          {user!.phone && <div><span className="text-slate-500">Phone:</span> {user!.phone}</div>}</dl>
      </Card>
      <Card>
        <h2 className="font-semibold">Privacy settings</h2>
        <div className="mt-3 space-y-3">
          <Field label="Language"><select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value as User["preferred_language"])}><option value="en">English</option><option value="ta">தமிழ்</option></select></Field>
          <Field label="Location use" hint="We only read your location when you ask (one-time lookups). We never track in the background.">
            <select className={inputCls} value={perm} onChange={(e) => setPerm(e.target.value as User["location_permission"])}>
              <option value="while_using">While I'm using the app</option><option value="journey_only">Only during journeys (planned)</option><option value="never">Never — I'll pick points on the map</option></select></Field>
          <Field label="Keep location history for" hint="0 means nothing is retained.">
            <select className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[0, 1, 7, 30].map((d) => <option key={d} value={d}>{d === 0 ? "Don't keep (recommended)" : `${d} day${d > 1 ? "s" : ""}`}</option>)}</select></Field>
          {msg && <Alert tone={msg.ok ? "info" : "error"}>{msg.text}</Alert>}
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
        </div>
      </Card>
    </div>
  );
}
