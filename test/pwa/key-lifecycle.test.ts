// @vitest-environment node
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { ProtectedKeyError } from "../../app/src/adapters/protected-key-store";
import { createPassportDatabase } from "../../app/src/storage/database";
import { createRepository } from "../../app/src/storage/repositories";
import { createStorageCoordinator } from "../../app/src/storage/storage-coordinator";
import {
  KeyServiceError,
  createKeyService,
  type KeyOperation,
  type KeyOperationAuthorizer
} from "../../app/src/services/key-service";

const NOW = "2026-07-21T12:00:00Z";
const STATE_A = `sha256:${"1".repeat(64)}`;
const STATE_B = `sha256:${"2".repeat(64)}`;
const EVIDENCE = Object.freeze({
  sha256: `sha256:${"a".repeat(64)}`,
  notAfter: "2026-10-20T00:00:00Z"
});

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

async function fixture(authorizer?: KeyOperationAuthorizer) {
  const database = createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() });
  const coordinator = createStorageCoordinator({ database, ownerId: "key-lifecycle-test-tab" });
  await coordinator.start();
  const authorizations: Array<{ operation: KeyOperation; stateHash: string }> = [];
  const authorization = authorizer ?? Object.freeze({
    async authorize(input: Readonly<{ operation: KeyOperation; stateHash: string }>) {
      authorizations.push({ ...input });
    }
  });
  let id = 0;
  const service = createKeyService({
    database,
    coordinator,
    authorization,
    capabilityEvidence: EVIDENCE,
    clock: Object.freeze({ now: () => NOW }),
    randomId: () => `test-${++id}`
  });
  return { database, coordinator, service, authorizations };
}

describe("protected key lifecycle service", () => {
  it("creates one public holder key set and binds signing to an exact authorized operation", async () => {
    const { coordinator, service, authorizations } = await fixture();
    const holder = await service.createHolderKeySet({ stateHash: STATE_A });

    expect(holder.authority).toMatch(/^key:ed25519:z/u);
    expect(holder.signing).toMatchObject({
      algorithm: "Ed25519",
      purpose: "signing",
      lifecycle: "active",
      authority: holder.authority,
      capabilityEvidence: EVIDENCE
    });
    expect(holder.agreement).toMatchObject({
      algorithm: "X25519",
      purpose: "agreement",
      lifecycle: "active",
      authority: holder.authority
    });
    expect(holder.signing.methodId).toBe(`hiri://${holder.authority}/key/main#key-1`);
    expect(JSON.stringify(holder)).not.toMatch(/privateKey|secretKey|privateBytes/iu);
    expect(authorizations).toEqual([{ operation: "authority-creation", stateHash: STATE_A }]);

    const message = new TextEncoder().encode("one exact presentation target");
    const signature = await service.sign({ methodId: holder.signing.methodId, bytes: message, stateHash: STATE_B });
    const publicKey = await crypto.subtle.importKey("raw", source(holder.signing.publicKeyBytes), { name: "Ed25519" }, false, ["verify"]);
    await expect(crypto.subtle.verify("Ed25519", publicKey, source(signature), source(message))).resolves.toBe(true);
    expect(authorizations.at(-1)).toEqual({ operation: "presentation-signing", stateHash: STATE_B });

    await expect(service.createHolderKeySet({ stateHash: STATE_A })).rejects.toMatchObject({
      code: "RHP_KEY_AUTHORITY_EXISTS"
    });
    coordinator.close();
  });

  it("requires an active same-authority replacement before compromise or retirement", async () => {
    const { coordinator, service, authorizations } = await fixture();
    const holder = await service.createHolderKeySet({ stateHash: STATE_A });

    await expect(service.markCompromised({
      keyId: holder.signing.keyId,
      replacementKeyId: "missing-replacement",
      stateHash: STATE_B
    })).rejects.toMatchObject({ code: "RHP_KEY_REPLACEMENT_REQUIRED" });
    expect((await service.inspect(holder.signing.keyId))?.lifecycle).toBe("active");

    const successor = await service.createSuccessorSigningKey({
      authority: holder.authority,
      methodId: `hiri://${holder.authority}/key/main#key-2`,
      stateHash: STATE_B
    });
    const compromised = await service.markCompromised({
      keyId: holder.signing.keyId,
      replacementKeyId: successor.keyId,
      stateHash: STATE_B
    });
    expect(compromised.lifecycle).toBe("compromised");
    expect(compromised.compromisedAt).toBe(NOW);
    await expect(service.sign({
      methodId: holder.signing.methodId,
      bytes: new Uint8Array([1]),
      stateHash: STATE_B
    })).rejects.toMatchObject({ code: "RHP_KEY_NOT_AUTHORIZED" });

    const successorTwo = await service.createSuccessorSigningKey({
      authority: holder.authority,
      methodId: `hiri://${holder.authority}/key/main#key-3`,
      stateHash: STATE_B
    });
    const retired = await service.retire({
      keyId: successor.keyId,
      replacementKeyId: successorTwo.keyId,
      stateHash: STATE_B
    });
    expect(retired).toMatchObject({ lifecycle: "retired", retiredAt: NOW });
    expect(authorizations.map(value => value.operation)).toContain("key-compromise");
    expect(authorizations.map(value => value.operation)).toContain("same-device-rotation");
    coordinator.close();
  });

  it("requires exact irreversible deletion confirmation and verifies that the handle is gone", async () => {
    const { database, coordinator, service } = await fixture();
    const holder = await service.createHolderKeySet({ stateHash: STATE_A });

    await expect(service.deleteKey({
      keyId: holder.signing.keyId,
      confirmedMethodId: `${holder.signing.methodId}-wrong`,
      acknowledgeIrrecoverableLoss: true,
      abandonAuthority: true,
      stateHash: STATE_B
    })).rejects.toMatchObject({ code: "RHP_KEY_DELETION_REFUSED" });
    await expect(service.deleteKey({
      keyId: holder.signing.keyId,
      confirmedMethodId: holder.signing.methodId,
      acknowledgeIrrecoverableLoss: true,
      abandonAuthority: false,
      stateHash: STATE_B
    })).rejects.toMatchObject({ code: "RHP_KEY_REPLACEMENT_REQUIRED" });

    const deleted = await service.deleteKey({
      keyId: holder.signing.keyId,
      confirmedMethodId: holder.signing.methodId,
      acknowledgeIrrecoverableLoss: true,
      abandonAuthority: true,
      stateHash: STATE_B
    });
    expect(deleted).toMatchObject({ lifecycle: "deleted", deletedAt: NOW });
    expect(await createRepository<{ id: string }>(database, "keys").get(`rhp:key:handle:${holder.signing.keyId}`)).toBeUndefined();
    await expect(service.sign({ methodId: holder.signing.methodId, bytes: new Uint8Array(), stateHash: STATE_B }))
      .rejects.toMatchObject({ code: "RHP_KEY_NOT_AUTHORIZED" });
    coordinator.close();
  });

  it("leaves no key or metadata when local authorization is cancelled", async () => {
    const cancelled = new DOMException("cancelled", "AbortError");
    const { database, coordinator, service } = await fixture(Object.freeze({
      authorize: async () => { throw cancelled; }
    }));

    await expect(service.createHolderKeySet({ stateHash: STATE_A })).rejects.toBe(cancelled);
    expect(await createRepository<{ id: string }>(database, "keys").all()).toEqual([]);
    expect((await createRepository<{ id: string }>(database, "settings").all())
      .filter(value => value.id.startsWith("rhp:key:metadata:"))).toEqual([]);
    coordinator.close();
  });

  it("rejects expired capability evidence before authorization or key access", async () => {
    const database = createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() });
    const coordinator = createStorageCoordinator({ database, ownerId: "expired-evidence-tab" });
    await coordinator.start();
    let calls = 0;
    const service = createKeyService({
      database,
      coordinator,
      authorization: Object.freeze({ authorize: async () => { calls += 1; } }),
      capabilityEvidence: Object.freeze({ ...EVIDENCE, notAfter: NOW }),
      clock: Object.freeze({ now: () => NOW }),
      randomId: () => "unused"
    });

    await expect(service.createHolderKeySet({ stateHash: STATE_A })).rejects.toMatchObject({
      code: "RHP_KEY_EVIDENCE_EXPIRED"
    });
    expect(calls).toBe(0);
    expect(await createRepository<{ id: string }>(database, "keys").all()).toEqual([]);
    coordinator.close();
  });
});
