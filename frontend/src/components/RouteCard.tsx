import type { RouteResult } from "../types/api";
import { km, mins } from "../utils/format";
import { ROUTE_COLORS } from "./RouteMap";
import { StatusBadge } from "./ui";

const CONF_STYLE = {
  insufficient: "bg-slate-200 text-slate-700", low: "bg-amber-100 text-amber-900",
  moderate: "bg-sky-100 text-sky-900", high: "bg-emerald-100 text-emerald-900",
} as const;

export default function RouteCard({ route, index, selected, onSelect }: { route: RouteResult; index: number; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${selected ? "border-brand-600 ring-2 ring-brand-600/30" : "border-slate-200"}`}>
      <button onClick={onSelect} aria-pressed={selected} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <span className="h-3 w-6 rounded" style={{ background: ROUTE_COLORS[index % 4] }} /> Route {String.fromCharCode(65 + index)}
          </h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONF_STYLE[route.data_confidence]}`}>
            Data confidence: {route.data_confidence}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{km(route.distance_m)} · about {mins(route.duration_s)}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{route.summary}</p>
      </button>

      {selected && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Model score (support from available data)</span>
              <span>{route.model_score === null ? "Not enough data" : route.model_score.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-slate-100" role="img" aria-label={`Model score ${route.model_score ?? "unavailable"} out of 1`}>
              <div className="h-2 rounded bg-brand-600" style={{ width: `${(route.model_score ?? 0) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">This is not a safety rating and not a guarantee. Missing data lowers confidence; it is not scored as unsafe.</p>
          </div>

          <ul className="space-y-2">
            {route.factors.map((f) => (
              <li key={f.factor} className="text-sm">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{f.label}</span><StatusBadge status={f.status} /></div>
                <p className="text-xs text-slate-600">{f.message}</p>
                {f.freshest && <p className="text-xs text-slate-400">Last updated {new Date(f.freshest).toLocaleDateString()}</p>}
              </li>
            ))}
          </ul>

          {route.context_notes.map((n) => <p key={n} className="rounded bg-amber-50 p-2 text-xs text-amber-900">{n}</p>)}
          <details className="text-xs text-slate-600"><summary className="cursor-pointer font-medium">How this is calculated</summary><p className="mt-1">{route.methodology}</p></details>
          <p className="text-xs italic text-slate-500">{route.disclaimer}</p>
        </div>
      )}
    </article>
  );
}
