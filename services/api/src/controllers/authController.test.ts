import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { CommunityModel } from "../models/Community.js";
import { UserModel } from "../models/User.js";
import { DeviceModel } from "../models/Device.js";
import { otpProvider } from "./authController.js";
import { MockOtpProvider } from "../services/otpProvider.js";

let mongod: MongoMemoryServer;
const app = createApp();
const communityId = "test-community";
const phoneNumber = "+639171234567";
const deviceId = "device-under-test";

function otpFor(phone: string): string {
  return (otpProvider as MockOtpProvider).peekCode(phone)!;
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
  await Promise.all([UserModel.deleteMany({}), DeviceModel.deleteMany({})]);
});

/** Registers via the real HTTP flow (request-otp + verify-otp) rather than seeding models directly. */
async function verifyOtpAs(phone: string, device: string) {
  await request(app).post("/api/auth/request-otp").send({ phoneNumber: phone });
  return request(app)
    .post("/api/auth/verify-otp")
    .send({ phoneNumber: phone, code: otpFor(phone), communityId, deviceId: device });
}

describe("verify-otp device registration", () => {
  it("lets the same account re-verify on the same deviceId (reinstall)", async () => {
    const first = await verifyOtpAs(phoneNumber, deviceId);
    expect(first.status).toBe(200);

    const second = await verifyOtpAs(phoneNumber, deviceId);
    expect(second.status).toBe(200);
    expect(second.body.userId).toBe(first.body.userId);
  });

  it("rejects a different account claiming a deviceId already bound to someone else", async () => {
    await verifyOtpAs(phoneNumber, deviceId);

    const attacker = await verifyOtpAs("+639179999999", deviceId);
    expect(attacker.status).toBe(409);

    const device = await DeviceModel.findOne({ deviceId });
    expect(device?.userId).not.toBe(undefined);
    const originalOwner = await UserModel.findOne({ phoneNumber });
    expect(device?.userId).toBe(originalOwner?.userId);
  });

  it("blocks a revoked device from completing verify-otp", async () => {
    await verifyOtpAs(phoneNumber, deviceId);
    await DeviceModel.findOneAndUpdate({ deviceId }, { revoked: true });

    const res = await verifyOtpAs(phoneNumber, deviceId);
    expect(res.status).toBe(403);
  });
});
