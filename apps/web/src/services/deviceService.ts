import type { Device } from "@tulonglink/shared";
import { authedFetch } from "./apiClient.js";

/** ADMIN-only — every call here hits an endpoint gated by `requireRole(["ADMIN"])` server-side. */

export async function listCommunityDevices(): Promise<Device[]> {
  return authedFetch<Device[]>("/api/devices");
}

export async function revokeDevice(deviceId: string): Promise<Device> {
  return authedFetch<Device>(`/api/devices/${encodeURIComponent(deviceId)}/revoke`, { method: "POST" });
}
