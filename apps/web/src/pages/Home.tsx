import { Link } from "react-router-dom";
import type { EmergencyCategory } from "@tulonglink/shared";
import { NetworkBadge } from "../components/NetworkBadge.js";

/**
 * Spec §15's primary screen also has a SEND HELP / SOS beacon button
 * that fires immediately over the encrypted BLE broadcast layer (§57).
 * That requires both BLE (Phase 3) and the crypto package (deferred
 * until BLE exists) — out of scope for Milestone 1. Category selection
 * below is the only path to reporting right now.
 */
const CATEGORIES: { category: EmergencyCategory; label: string }[] = [
  { category: "MEDICAL", label: "MEDICAL" },
  { category: "FIRE", label: "FIRE" },
  { category: "ACCIDENT", label: "ACCIDENT" },
  { category: "CRIME_SECURITY", label: "SECURITY" },
  { category: "RESCUE_REQUIRED", label: "RESCUE" },
  { category: "OTHER", label: "OTHER" },
];

export function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-red-700">TULONG LINK</h1>
        <NetworkBadge />
      </div>

      <h2 className="mb-6 text-center text-lg font-semibold text-gray-800">What's happening?</h2>

      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.category}
            to="/report"
            state={{ category: c.category }}
            className="flex aspect-square items-center justify-center rounded-xl bg-red-700 text-center text-lg font-bold text-white shadow active:bg-red-800"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <Link
        to="/emergencies"
        className="mt-8 text-center text-sm font-medium text-gray-600 underline"
      >
        View my reports
      </Link>
    </div>
  );
}
