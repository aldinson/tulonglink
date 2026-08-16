import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Emergency } from "@tulonglink/shared";
import { listEmergencies } from "../services/emergencyService.js";

export function EmergencyList() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);

  useEffect(() => {
    void listEmergencies().then(setEmergencies);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-sm px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-red-700">MY REPORTS</h1>

      {emergencies.length === 0 && <p className="text-sm text-gray-500">No reports on this phone yet.</p>}

      <ul className="space-y-3">
        {emergencies.map((e) => (
          <li key={e.incidentId}>
            <Link
              to={`/emergencies/${encodeURIComponent(e.incidentId)}`}
              className="block rounded-md border border-gray-200 p-3 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.category.replace(/_/g, " ")}</span>
                <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{e.deliveryState.replace(/_/g, " ")}</p>
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-8 block text-center text-sm font-medium text-gray-600 underline">
        Back to home
      </Link>
    </div>
  );
}
