import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { EvidenceStatus } from "../types/api";
import { STATUS_LABEL } from "../utils/format";

const STATUS_STYLE: Record<EvidenceStatus, string> = {
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  estimated: "bg-amber-50 text-amber-800 ring-amber-200",
  user_reported: "bg-sky-50 text-sky-800 ring-sky-200",
  simulated: "bg-violet-50 text-violet-800 ring-violet-200",
  unavailable: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const StatusBadge = ({ status }: { status: EvidenceStatus }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const v = {
    primary: "bg-brand-700 text-white hover:bg-brand-900 disabled:bg-slate-300",
    secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-slate-700 hover:bg-slate-100",
  }[variant];
  return <button {...p} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${v} ${className}`} />;
}

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>
);

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);
export const inputCls = "block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400";

export const Alert = ({ tone = "error", children }: { tone?: "error" | "info" | "warn"; children: ReactNode }) => (
  <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${
    tone === "error" ? "bg-red-50 text-red-800" : tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-sky-50 text-sky-900"}`}>{children}</div>
);

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" /> {label}…
  </div>
);

export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
    <p className="font-medium text-slate-800">{title}</p>
    {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
  </div>
);
