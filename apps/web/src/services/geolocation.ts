export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  timestamp: string;
}

const GPS_TIMEOUT_MS = 8000;

/**
 * Spec §29: attempt GPS, but never block submission if it's unavailable
 * or slow. Resolves to null on any failure/timeout instead of rejecting,
 * so callers don't need a try/catch just to handle "no GPS today."
 */
export function attemptGpsFix(): Promise<GpsFix | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      () => resolve(null),
      { timeout: GPS_TIMEOUT_MS, maximumAge: 60_000 }
    );
  });
}
