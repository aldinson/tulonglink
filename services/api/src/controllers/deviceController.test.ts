import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { ulid } from "ulid";
import { createApp } from "../app.js";
import { CommunityModel } from "../models/Community.js";
import { UserModel } from "../models/User.js";
import { DeviceModel } from "../models/Device.js";
import { signAccessToken } from "../services/tokenService.js";

let mongod: MongoMemoryServer;
const app = createApp();
const communityId = "test-community";
const otherCommunityId = "other-community";

function authHeader(claims: Parameters<typeof signAccessToken>[0]): [string, string] {
  return ["Authorization", `Bearer ${signAccessToken(claims).token}`];
}

async function seedUser(role: "RESIDENT" | "STAFF" | "ADMIN", community = communityId) {
  const userId = ulid();
  await UserModel.create({
    userId,
    phoneNumber: `+1555${Math.floor(Math.random() * 1e7)}`,
    communityId: community,
    role,
    createdAt: new Date().toISOString(),
  });
  return { userId, communityId: community, role, deviceId: ulid() };
}

async function seedDevice(deviceId: string, userId: string, community = communityId) {
  const now = new Date().toISOString();
  await DeviceModel.create({
    deviceId,
    userId,
    communityId: community,
    protocolVersion: 1,
    registeredAt: now,
    lastSeenAt: now,
    revoked: false,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await CommunityModel.create([
    { communityId, name: "Test Community", createdAt: new Date().toISOString() },
    { communityId: otherCommunityId, name: "Other Community", createdAt: new Date().toISOString() },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([UserModel.deleteMany({}), DeviceModel.deleteMany({})]);
});

describe("GET /api/devices", () => {
  it("lists devices in the admin's community only", async () => {
    const admin = await seedUser("ADMIN");
    const resident = await seedUser("RESIDENT");
    const elsewhere = await seedUser("RESIDENT", otherCommunityId);
    await seedDevice("device-a", resident.userId);
    await seedDevice("device-elsewhere", elsewhere.userId, otherCommunityId);

    const res = await request(app).get("/api/devices").set(...authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.map((d: { deviceId: string }) => d.deviceId)).toEqual(["device-a"]);
  });

  it("rejects a non-admin (STAFF)", async () => {
    const staff = await seedUser("STAFF");
    const res = await request(app).get("/api/devices").set(...authHeader(staff));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/devices/:deviceId/revoke", () => {
  it("revokes a device in the admin's community", async () => {
    const admin = await seedUser("ADMIN");
    const resident = await seedUser("RESIDENT");
    await seedDevice("device-a", resident.userId);

    const res = await request(app).post("/api/devices/device-a/revoke").set(...authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe(true);
    const stored = await DeviceModel.findOne({ deviceId: "device-a" });
    expect(stored?.revoked).toBe(true);
  });

  it("404s for a device in a different community", async () => {
    const admin = await seedUser("ADMIN");
    const elsewhere = await seedUser("RESIDENT", otherCommunityId);
    await seedDevice("device-elsewhere", elsewhere.userId, otherCommunityId);

    const res = await request(app).post("/api/devices/device-elsewhere/revoke").set(...authHeader(admin));
    expect(res.status).toBe(404);
  });
});
