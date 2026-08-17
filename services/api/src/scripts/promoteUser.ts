import { USER_ROLES, type UserRole } from "@tulonglink/shared";
import { connectDb, disconnectDb } from "../db/mongoose.js";
import { UserModel } from "../models/User.js";

/**
 * Local-dev-only affordance: there is no path in the app itself to create
 * a STAFF/ADMIN account yet (§10's registration flow always creates
 * RESIDENT — see authController.verifyOtp). Full "Manage users" is
 * Phase 6's admin tooling (§8.3); this just unblocks testing the Phase 5
 * dashboard against a real account. Usage:
 *
 *   npm run promote-user -w @tulonglink/api -- +639171234567 STAFF
 */
async function main(): Promise<void> {
  const [phoneNumber, roleArg = "STAFF"] = process.argv.slice(2);
  if (!phoneNumber) {
    console.error("Usage: promote-user <phoneNumber> [STAFF|ADMIN]");
    process.exit(1);
  }
  const role = roleArg as UserRole;
  if (!USER_ROLES.includes(role)) {
    console.error(`Invalid role "${roleArg}". Expected one of: ${USER_ROLES.join(", ")}`);
    process.exit(1);
  }

  await connectDb();

  const user = await UserModel.findOne({ phoneNumber });
  if (!user) {
    console.error(`No user with phone number "${phoneNumber}" — they must register (request-otp/verify-otp) first.`);
    await disconnectDb();
    process.exit(1);
  }

  user.role = role;
  await user.save();
  console.log(`"${phoneNumber}" is now ${role}.`);

  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
