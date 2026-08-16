import {
  EMERGENCY_MESSAGE_VERSION,
  type CreateEmergencyInput,
  type Emergency,
  type EmergencyCategory,
  type EmergencyEvent,
  type EmergencyPriority,
} from "@tulonglink/shared";
import { getDb } from "../db/db.js";
import { getOrCreateDeviceId } from "./deviceId.js";
import { getSession } from "./session.js";
import { triggerSync } from "./syncService.js";

export interface CreateEmergencyParams {
  category: EmergencyCategory;
  description: string;
  priority: EmergencyPriority;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  altitude: number | null;
  locationTimestamp: string | null;
  manualLocation: boolean;
}

/**
 * TTL is a fixed constant for the MVP; spec §25 requires it to
 * eventually be configurable (per community, via the configurations
 * collection) and to allow longer TTL for critical messages. Both are
 * true here already at the "which constant" level — only the "load it
 * from server config" part is deferred until Phase 6 introduces
 * per-community configuration.
 */
const DEFAULT_TTL_HOURS = 24;
const CRITICAL_TTL_HOURS = 72;

function toCreateEmergencyInput(emergency: Emergency): CreateEmergencyInput {
  const {
    incidentId,
    originDeviceId,
    communityId,
    category,
    description,
    priority,
    createdAt,
    originTimestamp,
    latitude,
    longitude,
    locationAccuracy,
    altitude,
    locationTimestamp,
    manualLocation,
    messageVersion,
    expiresAt,
  } = emergency;
  return {
    incidentId,
    originDeviceId,
    communityId,
    category,
    description,
    priority,
    createdAt,
    originTimestamp,
    latitude,
    longitude,
    locationAccuracy,
    altitude,
    locationTimestamp,
    manualLocation,
    messageVersion,
    expiresAt,
  };
}

/**
 * Always succeeds if IndexedDB is available, with zero network
 * dependency — this is the "works with no Internet" path (spec §14).
 * The immediate sync attempt afterward is opportunistic, not required
 * for this function to have done its job.
 */
export async function createEmergency(params: CreateEmergencyParams): Promise<Emergency> {
  const session = await getSession();
  if (!session) throw new Error("Must be signed in to create an emergency");

  const deviceId = await getOrCreateDeviceId();
  const now = new Date();
  const ttlHours = params.priority === "CRITICAL" ? CRITICAL_TTL_HOURS : DEFAULT_TTL_HOURS;

  const emergency: Emergency = {
    incidentId: `${deviceId}:${crypto.randomUUID()}`,
    originDeviceId: deviceId,
    reporterId: session.userId,
    communityId: session.communityId,
    category: params.category,
    description: params.description,
    priority: params.priority,
    createdAt: now.toISOString(),
    originTimestamp: now.toISOString(),
    latitude: params.latitude,
    longitude: params.longitude,
    locationAccuracy: params.locationAccuracy,
    altitude: params.altitude,
    locationTimestamp: params.locationTimestamp,
    manualLocation: params.manualLocation,
    messageVersion: EMERGENCY_MESSAGE_VERSION,
    expiresAt: new Date(now.getTime() + ttlHours * 3600_000).toISOString(),
    deliveryState: "LOCAL_ONLY",
    incidentStatus: null,
  };

  const event: EmergencyEvent = {
    id: crypto.randomUUID(),
    incidentId: emergency.incidentId,
    state: "LOCAL_ONLY",
    occurredAt: now.toISOString(),
  };

  const db = await getDb();
  const tx = db.transaction(["emergencies", "emergencyEvents", "syncQueue"], "readwrite");
  await tx.objectStore("emergencies").put(emergency);
  await tx.objectStore("emergencyEvents").put(event);
  await tx.objectStore("syncQueue").put({
    incidentId: emergency.incidentId,
    payload: toCreateEmergencyInput(emergency),
    attempts: 0,
  });
  await tx.done;

  // Opportunistic — Phase 3 will additionally/instead attempt relay via
  // BLE here. If this fails (offline, server down), the record above is
  // already durably LOCAL_ONLY; syncService retries later.
  void triggerSync();

  return emergency;
}

export async function listEmergencies(): Promise<Emergency[]> {
  const db = await getDb();
  const all = await db.getAll("emergencies");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEmergency(incidentId: string): Promise<Emergency | undefined> {
  const db = await getDb();
  return db.get("emergencies", incidentId);
}

export async function listEmergencyEvents(incidentId: string): Promise<EmergencyEvent[]> {
  const db = await getDb();
  const events = await db.getAllFromIndex("emergencyEvents", "incidentId", incidentId);
  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}
