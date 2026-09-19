import { useCallback, useState } from "react";

export interface Position { lat: number; lon: number; accuracy: number }

/** One-shot position lookup with human-readable errors. Never watches/tracks in the background. */
export function useGeolocation() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const locate = useCallback((): Promise<Position | null> => {
    setError(null);
    if (!("geolocation" in navigator)) { setError("This device doesn't support location. Pick a point on the map instead."); return Promise.resolve(null); }
    setBusy(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setBusy(false);
          if (p.coords.accuracy > 500) setError(`Location is approximate (±${Math.round(p.coords.accuracy)} m). Check the pin before planning.`);
          resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy });
        },
        (e) => {
          setBusy(false);
          setError(e.code === e.PERMISSION_DENIED ? "Location permission was denied. You can choose a point on the map instead."
            : e.code === e.TIMEOUT ? "Finding your location took too long. Try again or pick a point on the map."
            : "Your location isn't available right now. Pick a point on the map instead.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }, []);
  return { locate, error, busy };
}
