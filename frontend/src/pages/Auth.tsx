import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Field, inputCls } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { api, ApiError } from "../services/api";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 block text-center text-xl font-bold text-brand-900">SafeRoute <span className="text-brand-600">AI</span></Link>
        <Card><h1 className="mb-4 text-xl font-semibold">{title}</h1>{children}</Card>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/app";
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login(email, password); nav(from, { replace: true }); }
    catch (x) { setErr(x instanceof ApiError ? (x.status === 429 ? "Too many attempts. Please wait a minute." : x.message) : "Something went wrong."); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Log in">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email"><input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className={inputCls} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {err && <Alert>{err}</Alert>}
        <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Log in"}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">New here? <Link className="font-semibold text-brand-700 underline" to="/register">Create an account</Link></p>
    </Shell>
  );
}

export function Register() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", preferred_language: "en" as "en" | "ta" });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await api.register({ ...f, phone: f.phone || undefined });
      await login(f.email, f.password); nav("/app", { replace: true });
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Something went wrong."); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Create your account">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><input className={inputCls} required maxLength={120} autoComplete="name" value={f.name} onChange={set("name")} /></Field>
        <Field label="Email"><input className={inputCls} type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="Password" hint="At least 8 characters."><input className={inputCls} type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} /></Field>
        <Field label="Phone (optional)" hint="Only used if you choose to share it with trusted contacts."><input className={inputCls} type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Language"><select className={inputCls} value={f.preferred_language} onChange={set("preferred_language")}><option value="en">English</option><option value="ta">தமிழ்</option></select></Field>
        {err && <Alert>{err}</Alert>}
        <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-brand-700 underline" to="/login">Log in</Link></p>
    </Shell>
  );
}
