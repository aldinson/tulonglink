import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { ulid } from "ulid";
import { createApp } from "../app.js";
import { CommunityModel } from "../models/Community.js";
import { UserModel } from "../models/User.js";
import { signAccessToken } from "../services/tokenService.js";

let mongod: MongoMemoryServer;
const app = createApp();
const communityId = "test-community";

function authHeader(claims: Parameters<typeof signAccessToken>[0]): [string, string] {
  return ["Authorization", `Bearer ${signAccessToken(claims).token}`];
}

async function seedUser(role: "RESIDENT" | "STAFF" | "ADMIN") {
  const userId = ulid();
  await UserModel.create({
    userId,
    phoneNumber: `+1555${Math.floor(Math.random() * 1e7)}`,
    communityId,
    role,
    createdAt: new Date().toISOString(),
  });
  return { userId, communityId, role, deviceId: ulid() };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await CommunityModel.create({ communityId, name: "Test Community", createdAt: new Date().toISOString() });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

describe("GET /api/users/staff", () => {
  it("lists only STAFF/ADMIN users in the caller's community", async () => {
    const staff = await seedUser("STAFF");
    await seedUser("RESIDENT");
    const admin = await seedUser("ADMIN");

    const res = await request(app).get("/api/users/staff").set(...authHeader(staff));

    expect(res.status).toBe(200);
    const ids = res.body.map((u: { userId: string }) => u.userId).sort();
    expect(ids).toEqual([admin.userId, staff.userId].sort());
  });

  it("rejects a resident", async () => {
    const resident = await seedUser("RESIDENT");
    const res = await request(app).get("/api/users/staff").set(...authHeader(resident));
    expect(res.status).toBe(403);
  });
});
