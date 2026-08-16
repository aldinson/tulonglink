import type { Request, Response } from "express";
import { ulid } from "ulid";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import { IncidentModel } from "../models/Incident.js";
import { IncidentEventModel } from "../models/IncidentEvent.js";
import { HttpError } from "../middleware/errorHandler.js";

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

export async function getIncident(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  const incident = await IncidentModel.findOne({ incidentId: req.params.id });
  if (!incident || incident.communityId !== auth.communityId) {
    throw new HttpError(404, "Incident not found");
  }
  if (auth.role === "RESIDENT" && incident.reporterId !== auth.userId) {
    throw new HttpError(404, "Incident not found");
  }
  res.status(200).json(incident);
}
