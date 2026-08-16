import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Emergency } from "@tulonglink/shared";
import { getEmergency } from "../services/emergencyService.js";
import { DeliveryStatus } from "../components/DeliveryStatus.js";

export function EmergencyStatus() {
  const { id } = useParams<{ id: string }>();
  const [emergency, setEmergency] = useState<Emergency | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      const record = await getEmergency(id!);
      if (!cancelled) setEmergency(record ?? null);
    }
    void load();
    // Local storage can change out from under this view when the sync
    // queue updates deliveryState in the background — poll instead of
    // requiring a manual refresh so the checklist stays accurate.
    const interval = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id]);

  if (emergency === undefined) {
    return <div className="p-6 text-center text-gray-500">Loading…</div>;
  }
  if (emergency === null) {
    return <div className="p-6 text-center text-gray-500">Report not found on this device.</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-sm px-6 py-8">
      <h1 className="mb-1 text-xl font-bold text-red-700">EMERGENCY STATUS</h1>
      <p className="mb-6 text-sm text-gray-500">
        {emergency.category.replace(/_/g, " ")} · {emergency.priority}
      </p>

      <DeliveryStatus state={emergency.deliveryState} />

      <Link to="/" className="mt-8 block text-center text-sm font-medium text-gray-600 underline">
        Back to home
      </Link>
    </div>
  );
}
