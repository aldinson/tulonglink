import { Schema, model } from "mongoose";
import type { Community } from "@tulonglink/shared";

const communitySchema = new Schema<Community>({
  communityId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdAt: { type: String, required: true },
});

export const CommunityModel = model<Community>("Community", communitySchema, "communities");
