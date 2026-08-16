import { Router } from "express";
import { listCommunities } from "../controllers/communityController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const communityRouter = Router();

// Public: needed before a user has authenticated, to populate the
// registration screen's community picker (§10).
communityRouter.get("/", asyncHandler(listCommunities));
