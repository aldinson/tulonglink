import { describe, expect, it } from "vitest";
import { diffKnownIds } from "./messageSummary.js";

describe("diffKnownIds", () => {
  it("computes what to send and what to expect from the other side's summary", () => {
    const local = { knownIds: ["A123", "A124", "A125"] };
    const remote = { knownIds: ["A123", "A125", "A126"] };

    expect(diffKnownIds(local, remote)).toEqual({
      toSend: ["A124"],
      toRequest: ["A126"],
    });
  });

  it("is empty both ways when both sides already know the same set", () => {
    const summary = { knownIds: ["A123", "A124"] };
    expect(diffKnownIds(summary, summary)).toEqual({ toSend: [], toRequest: [] });
  });
});
