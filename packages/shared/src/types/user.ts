/** Spec §8. "Barangay Staff / Tanod" is modeled as STAFF. */
export const USER_ROLES = ["RESIDENT", "STAFF", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  userId: string;
  phoneNumber: string;
  communityId: string;
  role: UserRole;
  createdAt: string;
}
