// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest"; import { generateProtectedKey } from "../../app/src/adapters/protected-key-store"; import { closePassportDatabase } from "../../app/src/storage/database";
describe("protected key store", () => { afterAll(closePassportDatabase); it("persists a non-extractable private signing key", async () => { const key = await generateProtectedKey(`sign-${crypto.randomUUID()}`, "Ed25519", ["sign", "verify"]); expect(key.privateKey.extractable).toBe(false); expect(key.publicKeyBytes.byteLength).toBe(32); }); });
