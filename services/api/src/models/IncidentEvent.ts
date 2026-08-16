import { Schema, model } from "mongoose";
import { DELIVERY_STATES, type EmergencyEvent } from "@tulonglink/shared";

const incidentEventSchema = new Schema<EmergencyEvent>({
  id: { type: String, required: true, unique: true },
  incidentId: { type: String, required: true, index: true },
  state: { type: String, required: true, enum: DELIVERY_STATES },
  occurredAt: { type: String, required: true },
  detail: { type: String },
});

export const IncidentEventModel = model<EmergencyEvent>(
  "IncidentEvent",
  incidentEventSchema,
  "incident_events"
);
