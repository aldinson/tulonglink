import type { Emergency, EmergencyEvent, ResponderType, UserRole } from "@tulonglink/shared";
import { authedFetch } from "./apiClient.js";

/** Staff/admin-only calls — every one of these hits an endpoint gated by `requireRole` server-side. */

export interface StaffMember {
  userId: string;
  phoneNumber: string;
  role: UserRole;
}

export async function listCommunityIncidents(): Promise<Emergency[]> {
  return authedFetch<Emergency[]>("/api/incidents");
}

/** For the assignment dropdown — every STAFF/ADMIN account in this community. */
export async function listStaff(): Promise<StaffMember[]> {
  return authedFetch<StaffMember[]>("/api/users/staff");
}

export async function getIncident(incidentId: string): Promise<Emergency> {
  return authedFetch<Emergency>(`/api/incidents/${encodeURIComponent(incidentId)}`);
}

export async function getIncidentEvents(incidentId: string): Promise<EmergencyEvent[]> {
  return authedFetch<EmergencyEvent[]>(`/api/incidents/${encodeURIComponent(incidentId)}/events`);
}

export async function acknowledgeIncident(incidentId: string, note?: string): Promise<Emergency> {
  return authedFetch<Emergency>(`/api/incidents/${encodeURIComponent(incidentId)}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function assignIncident(
  incidentId: string,
  responderId: string,
  responderType: ResponderType,
  note?: string
): Promise<Emergency> {
  return authedFetch<Emergency>(`/api/incidents/${encodeURIComponent(incidentId)}/assign`, {
    method: "POST",
    body: JSON.stringify({ responderId, responderType, note }),
  });
}

export async function resolveIncident(incidentId: string, note?: string): Promise<Emergency> {
  return authedFetch<Emergency>(`/api/incidents/${encodeURIComponent(incidentId)}/resolve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function startIncidentProgress(incidentId: string, note?: string): Promise<Emergency> {
  return authedFetch<Emergency>(`/api/incidents/${encodeURIComponent(incidentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ incidentStatus: "IN_PROGRESS", note }),
  });
}

export async function cancelIncident(incidentId: string, note?: string): Promise<Emergency> {
  return authedFetch<Emergency>(`/api/incidents/${encodeURIComponent(incidentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ incidentStatus: "CANCELLED", note }),
  });
}
