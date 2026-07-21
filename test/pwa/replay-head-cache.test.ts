import { describe, expect, it } from "vitest";
import { createHeadCache } from "../../app/src/storage/head-cache";
import { replayKey } from "../../app/src/storage/replay-store";

describe("replay and head state", () => {
  it("builds unambiguous replay tuples", () => {
    expect(replayKey("request", "nonce")).toBe("request\u0000nonce");
  });

  it("keeps current-head persistence disabled under RHP-DR-002 D2-A", async () => {
    const cache = createHeadCache();
    await expect(cache.put({
      id: "issuer",
      version: 2,
      manifestHash: "sha256:a",
      source: "holder-supplied",
      retrievedAt: "2026-07-20T00:00:00Z",
      transportAuthenticated: true,
      issuerAuthoritative: true
    })).resolves.toMatchObject({
      code: "RHP_HEAD_CACHE_DISABLED",
      accepted: false,
      persisted: false
    });
    await expect(cache.get("issuer")).resolves.toMatchObject({
      result: "unknown",
      error: "CURRENT_HEAD_UNKNOWN",
      cache: "not-consulted",
      entry: null
    });
  });
});
