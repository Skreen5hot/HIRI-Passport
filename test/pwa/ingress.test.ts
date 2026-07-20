// @vitest-environment node
import { describe, expect, it } from "vitest"; import { parseIngressJson } from "../../app/src/services/ingress";
describe("ingress", () => { it("preserves bytes and provenance", () => { const result = parseIngressJson('{"ok":true}', "paste", "2026-07-20T00:00:00Z"); expect(result.value).toEqual({ ok: true }); expect(new TextDecoder().decode(result.provenance.originalBytes)).toBe('{"ok":true}'); }); it("rejects duplicate members", () => expect(() => parseIngressJson('{"id":1,"id":2}', "paste")).toThrow(/duplicate/i)); });
