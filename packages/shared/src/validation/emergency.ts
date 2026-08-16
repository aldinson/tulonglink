import { z } from "zod";
import { EMERGENCY_CATEGORIES, EMERGENCY_PRIORITIES } from "../types/emergency.js";

/**
 * What a device actually transmits when creating an emergency. reporterId
 * is deliberately absent — the server derives it from the authenticated
 * session, never trusts it from the payload (§27: nearby/incoming data is
 * untrusted). incidentId/originDeviceId/originTimestamp are generated
 * client-side at creation so the record is fully formed before any
 * network contact exists (§14: must work with no Internet). createdAt
 * and originTimestamp are both set once, at creation, and never change;
 * they coincide for Milestone 1 since there's exactly one origin device
 * and no relay hops yet to make them diverge.
 */
export const createEmergencySchema = z.object({
  incidentId: z.string().min(1),
  originDeviceId: z.string().min(1),
  communityId: z.string().min(1),
  category: z.enum(EMERGENCY_CATEGORIES),
  description: z.string().min(1).max(2000),
  priority: z.enum(EMERGENCY_PRIORITIES),
  createdAt: z.string().datetime(),
  originTimestamp: z.string().datetime(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  locationAccuracy: z.number().nonnegative().nullable(),
  altitude: z.number().nullable(),
  locationTimestamp: z.string().datetime().nullable(),
  manualLocation: z.boolean(),
  messageVersion: z.number().int().positive(),
  expiresAt: z.string().datetime(),
});

export type CreateEmergencyInput = z.infer<typeof createEmergencySchema>;
