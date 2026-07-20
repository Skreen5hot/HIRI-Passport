// @vitest-environment node
import { describe, expect, it } from "vitest"; import { qrCarrier, MAX_QR_BYTES } from "../../app/src/transports/qr-transport"; import { postPresentation } from "../../app/src/transports/web-transport";
describe("presentation delivery", () => { it("bounds QR payloads and requires HTTPS", async () => { expect(() => qrCarrier(new Uint8Array(MAX_QR_BYTES + 1))).toThrow(/too large/i); await expect(postPresentation("http://verifier.invalid", new Uint8Array())).rejects.toThrow(/HTTPS/u); }); });
