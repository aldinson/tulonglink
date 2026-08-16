import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { EmergencyCategory, EmergencyPriority } from "@tulonglink/shared";
import { attemptGpsFix, type GpsFix } from "../services/geolocation.js";
import { createEmergency } from "../services/emergencyService.js";

interface LocationState {
  category?: EmergencyCategory;
}

type GpsStatus = "ACQUIRING" | "ACQUIRED" | "UNAVAILABLE";

export function CreateEmergency() {
  const navigate = useNavigate();
  const routeState = useLocation().state as LocationState | null;

  const [category, setCategory] = useState<EmergencyCategory>(routeState?.category ?? "OTHER");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<EmergencyPriority>("HIGH");
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("ACQUIRING");
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    attemptGpsFix().then((fix) => {
      setGpsFix(fix);
      setGpsStatus(fix ? "ACQUIRED" : "UNAVAILABLE");
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // A GPS fix that hasn't resolved yet is treated the same as one that
    // failed: submission never waits on it (spec §14/§29).
    const useManual = manualLocation || gpsStatus !== "ACQUIRED";
    const lat = useManual ? (manualLat ? Number(manualLat) : null) : gpsFix?.latitude ?? null;
    const lng = useManual ? (manualLng ? Number(manualLng) : null) : gpsFix?.longitude ?? null;

    setSubmitting(true);
    try {
      const emergency = await createEmergency({
        category,
        description,
        priority,
        latitude: lat,
        longitude: lng,
        locationAccuracy: useManual ? null : gpsFix?.accuracy ?? null,
        altitude: useManual ? null : gpsFix?.altitude ?? null,
        locationTimestamp: useManual ? null : gpsFix?.timestamp ?? null,
        manualLocation: useManual,
      });
      // Local storage (§14) never fails because of GPS/network — submission
      // always succeeds at this point regardless of connectivity.
      navigate(`/emergencies/${encodeURIComponent(emergency.incidentId)}`, { replace: true });
    } catch {
      setError("Something went wrong saving this report on your phone. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-sm px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-red-700">SEND EMERGENCY</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="category">
            Emergency type
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EmergencyCategory)}
            className="mt-1 w-full rounded-md border border-gray-300 p-2"
          >
            {(
              [
                "MEDICAL",
                "FIRE",
                "CRIME_SECURITY",
                "ACCIDENT",
                "MISSING_PERSON",
                "NATURAL_DISASTER",
                "FLOOD",
                "LANDSLIDE",
                "EARTHQUAKE",
                "RESCUE_REQUIRED",
                "OTHER",
              ] as const
            ).map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's happening, and who needs help?"
            className="mt-1 w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as EmergencyPriority)}
            className="mt-1 w-full rounded-md border border-gray-300 p-2"
          >
            <option value="CRITICAL">Critical — life-threatening</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>

        <div className="rounded-md border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-700">Location</p>
          {gpsStatus === "ACQUIRING" && <p className="text-sm text-gray-500">Getting your location…</p>}
          {gpsStatus === "ACQUIRED" && !manualLocation && (
            <p className="text-sm text-gray-600">
              GPS location captured (±{Math.round(gpsFix!.accuracy)}m).{" "}
              <button type="button" className="underline" onClick={() => setManualLocation(true)}>
                Set manually instead
              </button>
            </p>
          )}
          {(gpsStatus === "UNAVAILABLE" || manualLocation) && (
            <div className="mt-2 space-y-2">
              {gpsStatus === "UNAVAILABLE" && (
                <p className="text-sm text-amber-700">
                  GPS is unavailable. You can still send this report — enter a location if you can, or leave it blank.
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-1/2 rounded-md border border-gray-300 p-2 text-sm"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-1/2 rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-red-700 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "SEND EMERGENCY"}
        </button>
      </form>
    </div>
  );
}
