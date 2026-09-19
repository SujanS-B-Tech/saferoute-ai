import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Facility, LatLon, RouteResult } from "../types/api";
import { km } from "../utils/format";

export const ROUTE_COLORS = ["#0f766e", "#4338ca", "#b45309", "#be185d"];

const pin = (color: string, label: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px #0006"><span style="transform:rotate(45deg);font:700 12px sans-serif">${label}</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28],
  });

const KIND_COLOR = { police: "#1d4ed8", hospital: "#b91c1c", safe_point: "#047857" } as const;

function Clicks({ onPick }: { onPick?: (p: LatLon) => void }) {
  useMapEvents({ click: (e) => onPick?.([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function Fit({ points }: { points: LatLon[] }) {
  const map = useMap();
  useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [40, 40] }); else if (points.length === 1) map.setView(points[0], 14); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(points)]);
  return null;
}

interface Props {
  origin: LatLon | null; destination: LatLon | null; routes: RouteResult[]; selected: number;
  onSelect: (i: number) => void; facilities: Facility[]; showFacilities: boolean;
  onPick?: (p: LatLon) => void; picking?: "origin" | "destination" | null;
}

export default function RouteMap({ origin, destination, routes, selected, onSelect, facilities, showFacilities, onPick, picking }: Props) {
  const fit: LatLon[] = routes.length ? routes.flatMap((r) => r.geometry) : [origin, destination].filter(Boolean) as LatLon[];
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-xl border border-slate-200" style={{ cursor: picking ? "crosshair" : undefined }}>
      <MapContainer center={[11.0168, 76.9558]} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Clicks onPick={onPick} />
        <Fit points={fit} />
        {routes.map((r, i) => i !== selected && (
          <Polyline key={r.route_id} positions={r.geometry} eventHandlers={{ click: () => onSelect(i) }}
            pathOptions={{ color: ROUTE_COLORS[i % 4], weight: 5, opacity: 0.45, dashArray: "6 8" }} />
        ))}
        {routes[selected] && (
          <Polyline positions={routes[selected].geometry} pathOptions={{ color: ROUTE_COLORS[selected % 4], weight: 7, opacity: 0.95 }} />
        )}
        {origin && <Marker position={origin} icon={pin("#0f766e", "A")} />}
        {destination && <Marker position={destination} icon={pin("#be123c", "B")} />}
        {showFacilities && facilities.map((f) => (
          <CircleMarker key={`${f.kind}-${f.id}`} center={[f.latitude, f.longitude]} radius={7}
            pathOptions={{ color: "#fff", weight: 2, fillColor: KIND_COLOR[f.kind], fillOpacity: 1 }}>
            <Popup>
              <strong>{f.name}</strong><br />{f.label} · {km(f.distance_m)}<br />
              <em>{f.verification_status === "simulated" ? "Simulated demo data" : f.verification_status}</em>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-white/95 p-2 text-xs shadow ring-1 ring-slate-200">
      {([["police", "Police station"], ["hospital", "Hospital"], ["safe_point", "Assistance point"]] as const).map(([k, l]) => (
        <div key={k} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: KIND_COLOR[k] }} />{l}</div>
      ))}
      <div className="mt-1 text-slate-500">CCTV locations are not shown (restricted data)</div>
    </div>
  );
}
