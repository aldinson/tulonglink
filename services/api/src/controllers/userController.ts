import type { Request, Response } from "express";
import { UserModel } from "../models/User.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await UserModel.findOne({ userId: req.auth!.userId });
  if (!user) throw new HttpError(404, "User not found");
  res.status(200).json({
    userId: user.userId,
    phoneNumber: user.phoneNumber,
    communityId: user.communityId,
    role: user.role,
    createdAt: user.createdAt,
  });
}

/**
 * Not in spec §41's endpoint list, but the assignment dashboard (§37)
 * needs a way to pick a responder — added the same way
 * `communityController.listCommunities` already documents ("the API may
 * be refined during implementation"). Staff-only, scoped to the caller's
 * community, and deliberately not full "manage users" CRUD (§8.3,
 * Phase 6) — read-only, and only STAFF/ADMIN accounts are listed, since
 * only those are assignable.
 */
export async function listStaff(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  const users = await UserModel.find({
    communityId: auth.communityId,
    role: { $in: ["STAFF", "ADMIN"] },
  }).sort({ phoneNumber: 1 });

  res.status(200).json(
    users.map((u) => ({ userId: u.userId, phoneNumber: u.phoneNumber, role: u.role }))
  );
}
