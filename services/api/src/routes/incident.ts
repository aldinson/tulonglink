import { Router } from "express";
import { createEmergencySchema } from "@tulonglink/shared";
import { createIncident, listIncidents, getIncident } from "../controllers/incidentController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const incidentRouter = Router();

incidentRouter.use(requireAuth);
incidentRouter.post("/", validateBody(createEmergencySchema), asyncHandler(createIncident));
incidentRouter.get("/", asyncHandler(listIncidents));
incidentRouter.get("/:id", asyncHandler(getIncident));
