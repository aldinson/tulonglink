import { Schema, model } from "mongoose";
import { USER_ROLES, type User } from "@tulonglink/shared";

const userSchema = new Schema<User>({
  userId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  communityId: { type: String, required: true, index: true },
  role: { type: String, required: true, enum: USER_ROLES, default: "RESIDENT" },
  createdAt: { type: String, required: true },
});

export const UserModel = model<User>("User", userSchema, "users");
