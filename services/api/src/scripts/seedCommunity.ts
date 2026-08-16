import { connectDb, disconnectDb } from "../db/mongoose.js";
import { CommunityModel } from "../models/Community.js";

/**
 * Seeds a non-Napo example community for local development, per spec §9
 * ("Do not hard-code Napo into the system") and §55 ("Do not hard-code
 * Napo or these coordinates"). Real deployments create their own
 * community via the admin flow once it exists (Phase 5/6).
 */
async function main(): Promise<void> {
  await connectDb();

  const communityId = "demo-community";
  const existing = await CommunityModel.findOne({ communityId });
  if (existing) {
    console.log(`Community "${communityId}" already exists, skipping.`);
  } else {
    await CommunityModel.create({
      communityId,
      name: "Demo Community",
      createdAt: new Date().toISOString(),
    });
    console.log(`Seeded community "${communityId}".`);
  }

  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
