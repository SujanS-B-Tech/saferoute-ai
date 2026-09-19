import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLang, type Key } from "../i18n";
import { api } from "../services/api";

const NAV: { to: string; key: Key }[] = [
  { to: "/app", key: "plan" }, { to: "/app/facilities", key: "nearby" }, { to: "/app/data", key: "dataSources" },
  { to: "/app/journeys", key: "journeys" }, { to: "/app/reports", key: "reports" }, { to: "/app/contacts", key: "contacts" }, { to: "/app/profile", key: "profile" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const nav = useNavigate();
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => { api.health().then((h) => setBanner(h.demo_banner)).catch(() => setBanner(null)); }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {banner && <div role="status" className="bg-violet-700 px-3 py-1 text-center text-xs font-semibold tracking-wide text-white">{banner}</div>}
      <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <Link to="/" className="text-lg font-bold text-brand-900">SafeRoute <span className="text-brand-600">AI</span></Link>
          <nav aria-label="Main" className="flex flex-1 gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/app"}
                className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-900" : "text-slate-600 hover:bg-slate-100"}`}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as "en" | "ta")} className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm">
            <option value="en">English</option><option value="ta">தமிழ்</option>
          </select>
          <Link to="/app/emergency" className="ml-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow-sm animate-pulse">
            SOS
          </Link>
          <span className="hidden text-sm text-slate-600 sm:inline ml-2">{user?.name}</span>
          <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={async () => { await logout(); nav("/"); }}>{t("logout")}</button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4"><Outlet /></main>
      <a href="tel:112" className="sticky bottom-0 z-[1000] block bg-red-700 py-3 text-center text-sm font-bold text-white hover:bg-red-800">
        {t("emergency")} — this app does not contact emergency services for you
      </a>
    </div>
  );
}
