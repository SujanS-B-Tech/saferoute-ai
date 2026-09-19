import { useEffect, useState } from "react";
import { Alert, Card, Spinner, StatusBadge } from "../components/ui";
import { api } from "../services/api";
import type { DataSource } from "../types/api";

export default function DataSources() {
  const [rows, setRows] = useState<DataSource[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.sources().then(setRows).catch((e) => setErr(e.message)); }, []);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Data confidence</h1>
        <p className="text-sm text-slate-600">Every factor used in route assessments, with where it comes from and what it can't tell you.</p>
      </div>
      {err && <Alert>{err}</Alert>}
      {!rows && !err && <Spinner />}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows?.map((s) => (
          <Card key={s.factor}>
            <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{s.label}</h2><StatusBadge status={s.status} /></div>
            <p className="mt-2 text-sm text-slate-700">{s.message ?? s.limitations}</p>
            <dl className="mt-2 space-y-0.5 text-xs text-slate-500">
              {s.owner && <div>Owner: {s.owner}</div>}{s.coverage && <div>Coverage: {s.coverage}</div>}
              <div>Source confidence: {Math.round(s.confidence * 100)}%</div>
              {s.last_updated && <div>Last updated: {new Date(s.last_updated).toLocaleDateString()}</div>}
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
