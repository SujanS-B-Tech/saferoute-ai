import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLang } from "../i18n";

const STEPS = [
  ["Compare alternatives", "We fetch several routes and split each into short segments."],
  ["Check the evidence", "Each segment is checked against mapped facilities and other datasets, with the source, freshness and verification status shown."],
  ["Explain, don't rank blindly", "You see the trade-offs between time, distance, data coverage and available safety-related data, and you choose."],
];

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-xl font-bold text-brand-900">SafeRoute <span className="text-brand-600">AI</span></span>
        <nav className="flex gap-2">
          {user ? <Link className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white" to="/app">{t("plan")}</Link> : <>
            <Link className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white" to="/login">{t("login")}</Link>
            <Link className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white" to="/register">{t("register")}</Link></>}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4">
        <section className="py-16 text-center sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Tamil Nadu · Prototype</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Don't just find the shortest route. Find the safest practical route.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            An evidence-aware route planner that shows what is known, what isn't, and how confident we are — so you can decide.
          </p>
          <Link to={user ? "/app" : "/register"} className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white shadow hover:bg-brand-900">
            {t("findRoutes")}
          </Link>
        </section>
        <section className="grid gap-4 pb-12 md:grid-cols-3">
          {STEPS.map(([h, p], i) => (
            <div key={h} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-900">{i + 1}</span>
              <h2 className="mt-3 font-semibold">{h}</h2><p className="mt-1 text-sm text-slate-600">{p}</p>
            </div>
          ))}
        </section>
        <section className="mb-16 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-semibold">Honest limits</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Assessments are based on available data and cannot guarantee personal safety.</li>
            <li>Missing data is shown as unavailable — never assumed safe or unsafe.</li>
            <li>This prototype runs on clearly labelled simulated data. It does not dispatch police or emergency services. In an emergency, call <a className="font-bold underline" href="tel:112">112</a>.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
