import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { Emergency } from "@tulonglink/shared";

// react-leaflet's default marker icon references relative image paths
// that break once bundled (a well-known Leaflet+bundler issue) — point
// it at the actual bundled asset URLs instead.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const FALLBACK_CENTER: [number, number] = [0, 0];

/** Spec §35's map view. Incidents with no GPS (manual location, spec §29) simply have no pin — nothing to show, not an error. */
export function IncidentMap({ incidents }: { incidents: Emergency[] }) {
  const located = useMemo(
    () => incidents.filter((i): i is Emergency & { latitude: number; longitude: number } => i.latitude !== null && i.longitude !== null),
    [incidents]
  );

  const center: [number, number] =
    located.length > 0 ? [located[0]!.latitude, located[0]!.longitude] : FALLBACK_CENTER;

  if (located.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500">
        No incidents with a known location to show.
      </div>
    );
  }

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "24rem", width: "100%" }} className="rounded-md">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {located.map((incident) => (
        <Marker key={incident.incidentId} position={[incident.latitude, incident.longitude]} icon={defaultIcon}>
          <Popup>
            <p className="font-semibold">{incident.category.replace(/_/g, " ")}</p>
            <p>{incident.priority}</p>
            <Link to={`/dashboard/incidents/${encodeURIComponent(incident.incidentId)}`} className="underline">
              View details
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
