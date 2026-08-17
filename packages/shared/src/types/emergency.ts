/**
 * Categories are a static enum for the MVP. Spec §12 requires them to
 * eventually be configurable per-community; that needs an admin CRUD
 * surface (§8.3) which is out of scope until the core relay path is
 * proven. Revisit when Phase 5/6 admin tooling lands.
 */
export const EMERGENCY_CATEGORIES = [
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
] as const;
export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[number];

export const EMERGENCY_PRIORITIES = ["CRITICAL", "HIGH", "NORMAL"] as const;
export type EmergencyPriority = (typeof EMERGENCY_PRIORITIES)[number];

/**
 * Resident-facing delivery pipeline (spec §16). This is intentionally a
 * different vocabulary from IncidentStatus: it answers "what has
 * physically happened to my report" rather than "what is the responder
 * doing about it." RELAYED / GATEWAY_RECEIVED are unreachable until the
 * BLE relay layer (Phase 3/4) exists — the UI must never claim them
 * before that's true.
 */
export const DELIVERY_STATES = [
  "LOCAL_ONLY",
  "RELAYED",
  "GATEWAY_RECEIVED",
  "SERVER_RECEIVED",
  "RESPONDER_ACKNOWLEDGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

/** Responder/server-side incident workflow (spec §36). */
export const INCIDENT_STATUSES = [
  "NEW",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/**
 * Spec §37's assignment categories. A responder is an existing STAFF/ADMIN
 * user tagged with one of these at assignment time — there is no separate
 * roster/CRUD collection yet (that's Phase 6's "Manage responders", §8.3).
 */
export const RESPONDER_TYPES = ["TANOD", "MEDICAL", "FIRE", "RESCUE", "OTHER"] as const;
export type ResponderType = (typeof RESPONDER_TYPES)[number];

/** Protocol/message schema version, independent of app release version. */
export const EMERGENCY_MESSAGE_VERSION = 1;

/**
 * Canonical emergency record (spec §14 minimum fields + §29 GPS fields).
 * Shared between client (IndexedDB) and server (Mongo projection) so the
 * two never drift into incompatible shapes.
 */
export interface Emergency {
  incidentId: string;
  originDeviceId: string;
  reporterId: string;
  communityId: string;
  category: EmergencyCategory;
  description: string;
  priority: EmergencyPriority;
  createdAt: string;
  originTimestamp: string;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  altitude: number | null;
  locationTimestamp: string | null;
  manualLocation: boolean;
  messageVersion: number;
  expiresAt: string;
  deliveryState: DeliveryState;
  incidentStatus: IncidentStatus | null;
  /** Set together, only by `POST /api/incidents/:id/assign` (spec §37). */
  assignedResponderId: string | null;
  assignedResponderType: ResponderType | null;
  assignedBy: string | null;
  assignedAt: string | null;
}

/** Local audit trail of what has actually happened to an emergency (§16, §31). */
export interface EmergencyEvent {
  id: string;
  incidentId: string;
  state: DeliveryState;
  occurredAt: string;
  detail?: string;
}
