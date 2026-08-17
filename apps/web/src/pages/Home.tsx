import { Link } from "react-router-dom";
import type { EmergencyCategory } from "@tulonglink/shared";
import { NetworkBadge } from "../components/NetworkBadge.js";
import { useAuth } from "../context/AuthContext.js";

/**
 * Spec §15's primary screen also has a SEND HELP / SOS beacon button
 * that fires immediately over the encrypted BLE broadcast layer (§57).
 * `packages/crypto` now exists (Phase 6, device signing keys), but §57's
 * beacon needs a *different* key (a per-community symmetric key issued
 * at registration) and the native BLE broadcast layer itself, which is
 * still blocked on the missing Android SDK (see apps/android/README.md)
 * — out of scope for Milestone 1. Category selection below is the only
 * path to reporting right now.
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
  const { session } = useAuth();
  const isResponder = session && session.role !== "RESIDENT";
  const isAdmin = session?.role === "ADMIN";

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

      {isResponder && (
        <Link
          to="/dashboard"
          className="mt-2 text-center text-sm font-medium text-gray-600 underline"
        >
          Responder Dashboard
        </Link>
      )}

      {isAdmin && (
        <Link
          to="/admin/devices"
          className="mt-2 text-center text-sm font-medium text-gray-600 underline"
        >
          Manage Devices
        </Link>
      )}
    </div>
  );
}
