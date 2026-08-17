import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Device } from "@tulonglink/shared";
import { listCommunityDevices, revokeDevice } from "../../services/deviceService.js";

/** Spec §8.3 "Revoke devices" — ADMIN-only, community-scoped. */
export function Devices() {
  const [devices, setDevices] = useState<Device[] | undefined>(undefined);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  const reload = () => void listCommunityDevices().then(setDevices);
  useEffect(reload, []);

  async function handleRevoke(deviceId: string) {
    setBusyDeviceId(deviceId);
    try {
      await revokeDevice(deviceId);
      reload();
    } finally {
      setBusyDeviceId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Devices</h1>

      {devices === undefined && <p className="text-sm text-gray-500">Loading…</p>}
      {devices?.length === 0 && <p className="text-sm text-gray-500">No devices registered in this community.</p>}

      <ul className="space-y-2">
        {devices?.map((device) => (
          <li key={device.deviceId} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
            <div>
              <p className="font-medium text-gray-900">{device.deviceId}</p>
              <p className="text-sm text-gray-500">
                Last seen {new Date(device.lastSeenAt).toLocaleString()}
                {device.revoked && <span className="ml-2 font-semibold text-red-700">REVOKED</span>}
              </p>
            </div>
            {!device.revoked && (
              <button
                disabled={busyDeviceId === device.deviceId}
                onClick={() => void handleRevoke(device.deviceId)}
                className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>

      <Link to="/" className="mt-8 block text-sm font-medium text-gray-600 underline">
        Back to home
      </Link>
    </div>
  );
}
