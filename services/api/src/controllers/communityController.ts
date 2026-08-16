import type { Request, Response } from "express";
import { CommunityModel } from "../models/Community.js";

/**
 * Not in spec §41's endpoint list, but registration (§10) needs a way to
 * pick a community without hard-coding one (§9) — the API list is
 * explicitly refinable during implementation ("The API may be refined
 * during implementation").
 */
export async function listCommunities(_req: Request, res: Response): Promise<void> {
  const communities = await CommunityModel.find().sort({ name: 1 });
  res.status(200).json(
    communities.map((c) => ({ communityId: c.communityId, name: c.name }))
  );
}
