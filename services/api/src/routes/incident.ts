import { Router } from "express";
import { assignIncidentSchema, createEmergencySchema, incidentActionSchema, patchIncidentSchema } from "@tulonglink/shared";
import {
  acknowledgeIncident,
  assignIncident,
  createIncident,
  getIncident,
  listIncidentEvents,
  listIncidents,
  patchIncident,
  resolveIncident,
} from "../controllers/incidentController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const incidentRouter = Router();

incidentRouter.use(requireAuth);
incidentRouter.post("/", validateBody(createEmergencySchema), asyncHandler(createIncident));
incidentRouter.get("/", asyncHandler(listIncidents));
incidentRouter.get("/:id", asyncHandler(getIncident));
incidentRouter.get("/:id/events", requireRole(["STAFF", "ADMIN"]), asyncHandler(listIncidentEvents));
incidentRouter.patch("/:id", requireRole(["STAFF", "ADMIN"]), validateBody(patchIncidentSchema), asyncHandler(patchIncident));
incidentRouter.post(
  "/:id/acknowledge",
  requireRole(["STAFF", "ADMIN"]),
  validateBody(incidentActionSchema),
  asyncHandler(acknowledgeIncident)
);
incidentRouter.post(
  "/:id/assign",
  requireRole(["STAFF", "ADMIN"]),
  validateBody(assignIncidentSchema),
  asyncHandler(assignIncident)
);
incidentRouter.post(
  "/:id/resolve",
  requireRole(["STAFF", "ADMIN"]),
  validateBody(incidentActionSchema),
  asyncHandler(resolveIncident)
);
