import type { DeliveryState, IncidentStatus } from "@tulonglink/shared";

/**
 * Spec §36's incident workflow. `EXPIRED` isn't reachable from here — it's
 * a background TTL sweep, not a staff action, and no such sweep exists yet
 * (deferred, same as the client-side equivalent).
 *
 * Assignment doesn't require a prior acknowledgment: staff jumping
 * straight from NEW to ASSIGNED is a real, common workflow, not a data
 * error, so it's a direct edge rather than something the server silently
 * backfills an ACKNOWLEDGED event for — that would record an action that
 * didn't actually happen (CLAUDE.md's delivery-accuracy principle applies
 * to the audit trail too, not just resident-facing delivery state).
 */
const ALLOWED_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  NEW: ["ACKNOWLEDGED", "ASSIGNED", "CANCELLED"],
  ACKNOWLEDGED: ["ASSIGNED", "RESOLVED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function isValidIncidentStatusTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * The `IncidentEvent`/`DeliveryState` this status change is recorded as —
 * reusing the same vocabulary the resident-facing delivery pipeline
 * already uses (`packages/shared/src/types/emergency.ts`'s `DELIVERY_STATES`
 * comment), so `apps/web`'s `DeliveryStatus` component needs no changes to
 * eventually reflect server-driven status once Server→Device sync exists.
 */
const DELIVERY_STATE_FOR_STATUS: Partial<Record<IncidentStatus, DeliveryState>> = {
  ACKNOWLEDGED: "RESPONDER_ACKNOWLEDGED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
};

export function deliveryStateForIncidentStatus(status: IncidentStatus): DeliveryState {
  const state = DELIVERY_STATE_FOR_STATUS[status];
  if (!state) throw new Error(`No delivery state mapping for incident status ${status}`);
  return state;
}
