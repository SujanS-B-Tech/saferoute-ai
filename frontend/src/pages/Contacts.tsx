import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Card, Empty, Field, inputCls, Spinner } from "../components/ui";
import { api, ApiError } from "../services/api";
import type { Contact } from "../types/api";

export default function Contacts() {
  const [items, setItems] = useState<Contact[] | null>(null);
  const [f, setF] = useState({ name: "", phone: "", relationship_label: "", can_receive_live_location: false });
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  useEffect(() => { api.contacts().then(setItems).catch((e) => setErr(e.message)); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      const c = await api.addContact({ ...f, relationship_label: f.relationship_label || null });
      setItems([...(items ?? []), c]); setF({ name: "", phone: "", relationship_label: "", can_receive_live_location: false });
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Something went wrong."); }
  };
  const remove = async (id: number) => {
    try { await api.deleteContact(id); setItems(items!.filter((c) => c.id !== id)); setConfirm(null); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Something went wrong."); }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
      <Card>
        <h1 className="text-lg font-semibold">Add a trusted contact</h1>
        <p className="mt-1 text-sm text-slate-600">Up to 5 people. Contacts are private to your account. Automated notification is not connected yet in this prototype.</p>
        <form onSubmit={add} className="mt-3 space-y-3">
          <Field label="Name"><input className={inputCls} required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputCls} required type="tel" pattern="\+?[0-9 \-]{7,15}" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Relationship (optional)"><input className={inputCls} maxLength={40} value={f.relationship_label} onChange={(e) => setF({ ...f, relationship_label: e.target.value })} /></Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={f.can_receive_live_location} onChange={(e) => setF({ ...f, can_receive_live_location: e.target.checked })} />
            <span>I consent to share my live location with this person during journeys I choose to share.</span></label>
          {err && <Alert>{err}</Alert>}
          <Button className="w-full" disabled={(items?.length ?? 0) >= 5}>Add contact</Button>
        </form>
      </Card>
      <div className="space-y-3">
        <h2 className="font-semibold">Your contacts</h2>
        {!items && !err && <Spinner />}
        {items?.length === 0 && <Empty title="No trusted contacts yet">Add someone you'd want to be able to follow your journey.</Empty>}
        {items?.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between gap-2">
              <div><p className="font-medium">{c.name}</p><p className="text-sm text-slate-600">{c.phone}{c.relationship_label && ` · ${c.relationship_label}`}</p>
                <p className="text-xs text-slate-500">Live location: {c.can_receive_live_location ? "consented" : "not shared"}</p></div>
              {confirm === c.id
                ? <div className="flex gap-1"><Button variant="danger" onClick={() => remove(c.id)}>Confirm</Button><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></div>
                : <Button variant="ghost" onClick={() => setConfirm(c.id)} aria-label={`Remove ${c.name}`}>Remove</Button>}
            </div>
          </Card>))}
      </div>
    </div>
  );
}
