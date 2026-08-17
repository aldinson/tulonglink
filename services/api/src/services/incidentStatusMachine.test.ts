import { describe, expect, it } from "vitest";
import type { IncidentStatus } from "@tulonglink/shared";
import { deliveryStateForIncidentStatus, isValidIncidentStatusTransition } from "./incidentStatusMachine.js";

describe("isValidIncidentStatusTransition", () => {
  it("allows acknowledging a new incident", () => {
    expect(isValidIncidentStatusTransition("NEW", "ACKNOWLEDGED")).toBe(true);
  });

  it("allows assigning directly from NEW, without requiring acknowledgment first", () => {
    expect(isValidIncidentStatusTransition("NEW", "ASSIGNED")).toBe(true);
  });

  it("allows resolving from ACKNOWLEDGED, ASSIGNED, or IN_PROGRESS", () => {
    expect(isValidIncidentStatusTransition("ACKNOWLEDGED", "RESOLVED")).toBe(true);
    expect(isValidIncidentStatusTransition("ASSIGNED", "RESOLVED")).toBe(true);
    expect(isValidIncidentStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
  });

  it("allows cancelling from any non-terminal status", () => {
    const nonTerminal: IncidentStatus[] = ["NEW", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"];
    for (const status of nonTerminal) {
      expect(isValidIncidentStatusTransition(status, "CANCELLED")).toBe(true);
    }
  });

  it("rejects moving straight from NEW to RESOLVED", () => {
    expect(isValidIncidentStatusTransition("NEW", "RESOLVED")).toBe(false);
  });

  it("rejects any transition out of a terminal status", () => {
    expect(isValidIncidentStatusTransition("RESOLVED", "IN_PROGRESS")).toBe(false);
    expect(isValidIncidentStatusTransition("CANCELLED", "ACKNOWLEDGED")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(isValidIncidentStatusTransition("ASSIGNED", "NEW")).toBe(false);
    expect(isValidIncidentStatusTransition("IN_PROGRESS", "ACKNOWLEDGED")).toBe(false);
  });
});

describe("deliveryStateForIncidentStatus", () => {
  it("maps every reachable status to its resident-facing delivery state", () => {
    expect(deliveryStateForIncidentStatus("ACKNOWLEDGED")).toBe("RESPONDER_ACKNOWLEDGED");
    expect(deliveryStateForIncidentStatus("ASSIGNED")).toBe("ASSIGNED");
    expect(deliveryStateForIncidentStatus("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(deliveryStateForIncidentStatus("RESOLVED")).toBe("RESOLVED");
    expect(deliveryStateForIncidentStatus("CANCELLED")).toBe("CANCELLED");
  });

  it("throws for a status with no delivery-state mapping (NEW, EXPIRED)", () => {
    expect(() => deliveryStateForIncidentStatus("NEW")).toThrow();
    expect(() => deliveryStateForIncidentStatus("EXPIRED")).toThrow();
  });
});
