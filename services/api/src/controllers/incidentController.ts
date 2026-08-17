import type { Request, Response } from "express";
import { ulid } from "ulid";
import type { AssignIncidentInput, CreateEmergencyInput, IncidentStatus, PatchIncidentInput } from "@tulonglink/shared";
import { IncidentModel, type IncidentDocument } from "../models/Incident.js";
import { IncidentEventModel } from "../models/IncidentEvent.js";
import { UserModel } from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";
import { deliveryStateForIncidentStatus, isValidIncidentStatusTransition } from "../services/incidentStatusMachine.js";
import type { AccessTokenClaims } from "../services/tokenService.js";

export async function createIncident(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateEmergencyInput;
  const auth = req.auth!;

  // The client's communityId must match the authenticated session's —
  // never trust a client-asserted community for where an incident lands.
  if (input.communityId !== auth.communityId) {
    throw new HttpError(403, "communityId does not match authenticated session");
  }

  // Dedup (§24): the sync queue may retry a submission whose response was
  // lost even though the server actually received it. Treat a resend of
  // a known incidentId as a no-op success, not a duplicate record.
  const existing = await IncidentModel.findOne({ incidentId: input.incidentId });
  if (existing) {
    res.status(200).json(existing);
    return;
  }

  const incident = await IncidentModel.create({
    ...input,
    reporterId: auth.userId,
    deliveryState: "SERVER_RECEIVED",
    incidentStatus: "NEW",
  });

  await IncidentEventModel.create({
    id: ulid(),
    incidentId: incident.incidentId,
    state: "SERVER_RECEIVED",
    occurredAt: new Date().toISOString(),
  });

  res.status(201).json(incident);
}

export async function listIncidents(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  // Residents see only their own reports (§8.1: "View own emergencies").
  // Staff/admins see the whole community (§8.2/§8.3).
  const filter =
    auth.role === "RESIDENT"
      ? { communityId: auth.communityId, reporterId: auth.userId }
      : { communityId: auth.communityId };

  const incidents = await IncidentModel.find(filter).sort({ createdAt: -1 }).limit(200);
  res.status(200).json(incidents);
}

/** Shared by every incident endpoint that operates on one existing incident. */
async function findIncidentInCommunity(incidentId: string, auth: AccessTokenClaims): Promise<IncidentDocument> {
  const incident = await IncidentModel.findOne({ incidentId });
  if (!incident || incident.communityId !== auth.communityId) {
    throw new HttpError(404, "Incident not found");
  }
  if (auth.role === "RESIDENT" && incident.reporterId !== auth.userId) {
    throw new HttpError(404, "Incident not found");
  }
  return incident;
}

export async function getIncident(req: Request, res: Response): Promise<void> {
  const incident = await findIncidentInCommunity(req.params.id!, req.auth!);
  res.status(200).json(incident);
}

export async function listIncidentEvents(req: Request, res: Response): Promise<void> {
  const incident = await findIncidentInCommunity(req.params.id!, req.auth!);
  const events = await IncidentEventModel.find({ incidentId: incident.incidentId }).sort({ occurredAt: 1 });
  res.status(200).json(events);
}

/**
 * The one place an incident's status actually changes (spec §36: "every
 * status change should generate an event"). Callers set any
 * transition-specific fields (e.g. assignment) on `incident` first, then
 * call this to validate the move, persist it, and append the audit-trail
 * event — reusing `IncidentEventModel`/`DeliveryState` rather than a
 * second event log (see `packages/shared`'s `DELIVERY_STATES` comment).
 */
async function transitionIncidentStatus(
  incident: IncidentDocument,
  toStatus: IncidentStatus,
  note: string | undefined
): Promise<void> {
  const fromStatus = incident.incidentStatus ?? "NEW";
  if (!isValidIncidentStatusTransition(fromStatus, toStatus)) {
    throw new HttpError(409, `Cannot move incident from ${fromStatus} to ${toStatus}`);
  }

  const deliveryState = deliveryStateForIncidentStatus(toStatus);
  incident.incidentStatus = toStatus;
  incident.deliveryState = deliveryState;
  await incident.save();

  await IncidentEventModel.create({
    id: ulid(),
    incidentId: incident.incidentId,
    state: deliveryState,
    occurredAt: new Date().toISOString(),
    detail: note,
  });
}

export async function acknowledgeIncident(req: Request, res: Response): Promise<void> {
  const incident = await findIncidentInCommunity(req.params.id!, req.auth!);
  const { note } = req.body as { note?: string };
  await transitionIncidentStatus(incident, "ACKNOWLEDGED", note);
  res.status(200).json(incident);
}

export async function assignIncident(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  const incident = await findIncidentInCommunity(req.params.id!, auth);
  const { responderId, responderType, note } = req.body as AssignIncidentInput;

  // A responder must be an existing staff member of this community —
  // nearby/incoming data is untrusted (§27), and an assignment to a
  // nonexistent or resident account would silently go nowhere.
  const responder = await UserModel.findOne({ userId: responderId, communityId: auth.communityId });
  if (!responder || responder.role === "RESIDENT") {
    throw new HttpError(400, "responderId must be an existing staff member of this community");
  }

  incident.assignedResponderId = responderId;
  incident.assignedResponderType = responderType;
  incident.assignedBy = auth.userId;
  incident.assignedAt = new Date().toISOString();

  await transitionIncidentStatus(incident, "ASSIGNED", note);
  res.status(200).json(incident);
}

export async function resolveIncident(req: Request, res: Response): Promise<void> {
  const incident = await findIncidentInCommunity(req.params.id!, req.auth!);
  const { note } = req.body as { note?: string };
  await transitionIncidentStatus(incident, "RESOLVED", note);
  res.status(200).json(incident);
}

/** `PATCH /api/incidents/:id` — the two transitions with no dedicated
 * action route: starting work and cancelling (see `patchIncidentSchema`). */
export async function patchIncident(req: Request, res: Response): Promise<void> {
  const incident = await findIncidentInCommunity(req.params.id!, req.auth!);
  const { incidentStatus, note } = req.body as PatchIncidentInput;

  if (!incidentStatus) {
    res.status(200).json(incident);
    return;
  }

  await transitionIncidentStatus(incident, incidentStatus, note);
  res.status(200).json(incident);
}
