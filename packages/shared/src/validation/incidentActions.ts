import { z } from "zod";
import { RESPONDER_TYPES } from "../types/emergency.js";

/** Shared by acknowledge/resolve and the generic PATCH — spec §8.2 "Add notes". */
export const incidentActionSchema = z.object({
  note: z.string().min(1).max(2000).optional(),
});

export const assignIncidentSchema = z.object({
  responderId: z.string().min(1),
  responderType: z.enum(RESPONDER_TYPES),
  note: z.string().min(1).max(2000).optional(),
});

/** `PATCH /api/incidents/:id` — the generic status move (§41), restricted
 * to the two transitions with no dedicated action endpoint: starting work
 * and cancelling. Acknowledge/assign/resolve always go through their own
 * routes so each keeps its own request shape. */
export const patchIncidentSchema = z.object({
  incidentStatus: z.enum(["IN_PROGRESS", "CANCELLED"]).optional(),
  note: z.string().min(1).max(2000).optional(),
});

export type IncidentActionInput = z.infer<typeof incidentActionSchema>;
export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;
export type PatchIncidentInput = z.infer<typeof patchIncidentSchema>;
