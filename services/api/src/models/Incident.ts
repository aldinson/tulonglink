import { Schema, model } from "mongoose";
import {
  DELIVERY_STATES,
  EMERGENCY_CATEGORIES,
  EMERGENCY_PRIORITIES,
  INCIDENT_STATUSES,
  type Emergency,
} from "@tulonglink/shared";

const incidentSchema = new Schema<Emergency>({
  incidentId: { type: String, required: true, unique: true },
  originDeviceId: { type: String, required: true, index: true },
  reporterId: { type: String, required: true, index: true },
  communityId: { type: String, required: true, index: true },
  category: { type: String, required: true, enum: EMERGENCY_CATEGORIES },
  description: { type: String, required: true },
  priority: { type: String, required: true, enum: EMERGENCY_PRIORITIES, index: true },
  createdAt: { type: String, required: true, index: true },
  originTimestamp: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  locationAccuracy: { type: Number, default: null },
  altitude: { type: Number, default: null },
  locationTimestamp: { type: String, default: null },
  manualLocation: { type: Boolean, required: true },
  messageVersion: { type: Number, required: true },
  expiresAt: { type: String, required: true },
  deliveryState: { type: String, required: true, enum: DELIVERY_STATES, index: true },
  incidentStatus: { type: String, enum: INCIDENT_STATUSES, default: null },
});

incidentSchema.index({ latitude: 1, longitude: 1 });

export const IncidentModel = model<Emergency>("Incident", incidentSchema, "incidents");
