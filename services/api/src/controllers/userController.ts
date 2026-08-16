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
