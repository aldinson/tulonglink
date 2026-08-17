import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { ulid } from "ulid";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import { createApp } from "../app.js";
import { CommunityModel } from "../models/Community.js";
import { UserModel } from "../models/User.js";
import { IncidentModel } from "../models/Incident.js";
import { IncidentEventModel } from "../models/IncidentEvent.js";
import { signAccessToken } from "../services/tokenService.js";

/**
 * The first controller-level test in this codebase (previous phases only
 * had service-level tests) — Phase 5 is also the first feature with real
 * multi-step server-side state (status transitions, assignment
 * validation), which is exactly what the README flagged as the trigger
 * for adding a real Mongo instance instead of only unit-testing pure
 * logic. `mongodb-memory-server` connects the default mongoose
 * connection directly, bypassing `connectDb()`/`env.MONGO_URI` (which
 * `testSetup.ts` only sets to a placeholder — nothing here ever dials it).
 */
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

async function createTestIncident(reporter: Awaited<ReturnType<typeof seedUser>>) {
  const payload: CreateEmergencyInput = {
    incidentId: `${reporter.userId}:${ulid()}`,
    originDeviceId: reporter.deviceId,
    communityId: reporter.communityId,
    category: "MEDICAL",
    description: "Person collapsed and needs assistance",
    priority: "CRITICAL",
    createdAt: new Date().toISOString(),
    originTimestamp: new Date().toISOString(),
    latitude: 10.1,
    longitude: 123.1,
    locationAccuracy: 10,
    altitude: null,
    locationTimestamp: null,
    manualLocation: false,
    messageVersion: 1,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };

  const res = await request(app).post("/api/incidents").set(...authHeader(reporter)).send(payload);
  expect(res.status).toBe(201);
  return res.body.incidentId as string;
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
  await Promise.all([
    IncidentModel.deleteMany({}),
    IncidentEventModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

describe("incident status transitions", () => {
  it("acknowledge -> assign -> resolve, each recording an audit-trail event with the resident-facing delivery state", async () => {
    const resident = await seedUser("RESIDENT");
    const staff = await seedUser("STAFF");
    const incidentId = await createTestIncident(resident);

    const ack = await request(app)
      .post(`/api/incidents/${incidentId}/acknowledge`)
      .set(...authHeader(staff))
      .send({ note: "on it" });
    expect(ack.status).toBe(200);
    expect(ack.body.incidentStatus).toBe("ACKNOWLEDGED");
    expect(ack.body.deliveryState).toBe("RESPONDER_ACKNOWLEDGED");

    const assign = await request(app)
      .post(`/api/incidents/${incidentId}/assign`)
      .set(...authHeader(staff))
      .send({ responderId: staff.userId, responderType: "MEDICAL" });
    expect(assign.status).toBe(200);
    expect(assign.body.incidentStatus).toBe("ASSIGNED");
    expect(assign.body.assignedResponderId).toBe(staff.userId);
    expect(assign.body.assignedResponderType).toBe("MEDICAL");
    expect(assign.body.assignedBy).toBe(staff.userId);

    const resolve = await request(app)
      .post(`/api/incidents/${incidentId}/resolve`)
      .set(...authHeader(staff))
      .send({});
    expect(resolve.status).toBe(200);
    expect(resolve.body.incidentStatus).toBe("RESOLVED");

    const events = await request(app).get(`/api/incidents/${incidentId}/events`).set(...authHeader(staff));
    expect(events.status).toBe(200);
    const states = events.body.map((e: { state: string }) => e.state);
    expect(states).toEqual(["SERVER_RECEIVED", "RESPONDER_ACKNOWLEDGED", "ASSIGNED", "RESOLVED"]);
    expect(events.body[1].detail).toBe("on it");
  });

  it("allows assigning directly from NEW without a prior acknowledge call", async () => {
    const resident = await seedUser("RESIDENT");
    const staff = await seedUser("STAFF");
    const incidentId = await createTestIncident(resident);

    const assign = await request(app)
      .post(`/api/incidents/${incidentId}/assign`)
      .set(...authHeader(staff))
      .send({ responderId: staff.userId, responderType: "FIRE" });

    expect(assign.status).toBe(200);
    expect(assign.body.incidentStatus).toBe("ASSIGNED");
  });

  it("rejects an invalid transition (resolve straight from NEW) with 409", async () => {
    const resident = await seedUser("RESIDENT");
    const staff = await seedUser("STAFF");
    const incidentId = await createTestIncident(resident);

    const resolve = await request(app)
      .post(`/api/incidents/${incidentId}/resolve`)
      .set(...authHeader(staff))
      .send({});

    expect(resolve.status).toBe(409);
  });

  it("rejects assigning to a resident (not staff) with 400", async () => {
    const resident = await seedUser("RESIDENT");
    const staff = await seedUser("STAFF");
    const otherResident = await seedUser("RESIDENT");
    const incidentId = await createTestIncident(resident);

    const assign = await request(app)
      .post(`/api/incidents/${incidentId}/assign`)
      .set(...authHeader(staff))
      .send({ responderId: otherResident.userId, responderType: "TANOD" });

    expect(assign.status).toBe(400);
  });

  it("rejects a resident calling a staff-only action with 403", async () => {
    const resident = await seedUser("RESIDENT");
    const incidentId = await createTestIncident(resident);

    const ack = await request(app)
      .post(`/api/incidents/${incidentId}/acknowledge`)
      .set(...authHeader(resident))
      .send({});

    expect(ack.status).toBe(403);
  });

  it("404s for staff from a different community", async () => {
    const resident = await seedUser("RESIDENT");
    const staffElsewhere = await seedUser("STAFF", otherCommunityId);
    const incidentId = await createTestIncident(resident);

    const ack = await request(app)
      .post(`/api/incidents/${incidentId}/acknowledge`)
      .set(...authHeader(staffElsewhere))
      .send({});

    expect(ack.status).toBe(404);
  });

  it("PATCH moves ASSIGNED -> IN_PROGRESS -> CANCELLED", async () => {
    const resident = await seedUser("RESIDENT");
    const staff = await seedUser("STAFF");
    const incidentId = await createTestIncident(resident);

    await request(app)
      .post(`/api/incidents/${incidentId}/assign`)
      .set(...authHeader(staff))
      .send({ responderId: staff.userId, responderType: "OTHER" });

    const inProgress = await request(app)
      .patch(`/api/incidents/${incidentId}`)
      .set(...authHeader(staff))
      .send({ incidentStatus: "IN_PROGRESS" });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.incidentStatus).toBe("IN_PROGRESS");

    const cancelled = await request(app)
      .patch(`/api/incidents/${incidentId}`)
      .set(...authHeader(staff))
      .send({ incidentStatus: "CANCELLED", note: "duplicate report" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.incidentStatus).toBe("CANCELLED");
  });
});
