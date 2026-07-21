// @vitest-environment node
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { encodeBase64Url } from "../../src/core/scalars.mjs";
import { createPassportDatabase } from "../../app/src/storage/database";
import {
  PORTFOLIO_HEAD_PREFIX,
  type StoredPortfolioHead,
  type StoredPortfolioVersion
} from "../../app/src/storage/portfolio-store";
import { createRepository } from "../../app/src/storage/repositories";
import type { StoredEncryptedRecord } from "../../app/src/storage/record-store";
import { createStorageCoordinator } from "../../app/src/storage/storage-coordinator";
import { createKeyService } from "../../app/src/services/key-service";
import {
  PortfolioServiceError,
  createPortfolioService,
  type PortfolioRecord
} from "../../app/src/services/portfolio-service";

const NOW = "2026-07-21T12:00:00Z";
const STATE_HASH = `sha256:${"1".repeat(64)}`;
const EVIDENCE = Object.freeze({
  sha256: `sha256:${"a".repeat(64)}`,
  notAfter: "2026-10-20T00:00:00Z"
});

function randomId(seed: number): string {
  const value = new Uint8Array(16);
  value.fill(seed);
  return encodeBase64Url(value);
}

async function fixture() {
  const database = createPassportDatabase({ profile: "real-holder-preview", factory: new IDBFactory() });
  const coordinator = createStorageCoordinator({ database, ownerId: `portfolio-test-${crypto.randomUUID()}` });
  await coordinator.start();
  let keyId = 0;
  const keyService = createKeyService({
    database,
    coordinator,
    authorization: Object.freeze({ authorize: async () => undefined }),
    capabilityEvidence: EVIDENCE,
    clock: Object.freeze({ now: () => NOW }),
    randomId: () => `portfolio-key-${++keyId}`
  });
  const holder = await keyService.createHolderKeySet({ stateHash: STATE_HASH });
  let operationId = 0;
  const service = createPortfolioService({
    database,
    coordinator,
    keyService,
    clock: Object.freeze({ now: () => NOW }),
    randomId: () => `operation-${++operationId}`
  });
  return { database, coordinator, holder, service };
}

function futureRecord(seed: number, secret: string): PortfolioRecord {
  return Object.freeze({
    recordId: randomId(seed),
    kind: "future-extension-record",
    addedAt: NOW,
    extension: Object.freeze({ privateClaim: secret, revision: seed })
  });
}

describe("encrypted private portfolio state", () => {
  it("persists only Mode 2 ciphertext and separately encrypted local metadata", async () => {
    const { database, coordinator, holder, service } = await fixture();
    const initialized = await service.initialize({ authority: holder.authority });
    const secret = "holder-only medical accommodation";
    const label = "Private accessibility record";
    const notes = "Never disclose without explicit review";
    const localId = "local-ui-record-1";
    const record = futureRecord(1, secret);

    const outcome = await service.rewrite({
      authority: holder.authority,
      expectedHead: initialized.head,
      change: Object.freeze({ upsert: record }),
      metadataChange: Object.freeze({
        upsert: Object.freeze({ recordId: record.recordId, localId, label, notes, archived: false, tags: ["health"] })
      })
    });
    expect(outcome.result).toBe("committed");
    if (outcome.result !== "committed") throw new Error("expected commit");
    expect(outcome.snapshot.portfolio.records).toEqual([record]);
    expect(outcome.snapshot.metadata).toEqual([
      { recordId: record.recordId, localId, label, notes, archived: false, tags: ["health"] }
    ]);
    expect(outcome.snapshot.portfolio.records[0]).not.toHaveProperty("localId");
    expect(outcome.snapshot.portfolio.records[0]).not.toHaveProperty("label");
    expect(outcome.snapshot.publication).toBe("local-only");

    const versions = await createRepository<StoredPortfolioVersion>(database, "portfolio").all();
    const records = await createRepository<StoredEncryptedRecord>(database, "records").all();
    expect(versions).toHaveLength(2);
    expect(records).toHaveLength(1);
    expect(versions[1].manifest).toMatchObject({
      uri: `hiri://${holder.authority}/data/passport-main`,
      publisher: holder.authority,
      privacy: { mode: "encrypted", parameters: { recipients: [expect.objectContaining({ id: expect.any(String) })] } }
    });
    expect(versions[1].publication).toBe("local-only");
    expect(versions[1]).not.toHaveProperty("records");
    expect(records[0]).not.toHaveProperty("recordId");
    expect(records[0]).not.toHaveProperty("localId");
    expect(records[0]).not.toHaveProperty("label");
    expect(records[0]).not.toHaveProperty("notes");
    const atRest = JSON.stringify({ versions, records });
    expect(atRest).not.toContain(secret);
    expect(atRest).not.toContain(label);
    expect(atRest).not.toContain(notes);
    expect(atRest).not.toContain(localId);
    expect(atRest).not.toContain(record.recordId);

    await expect(service.load({ authority: holder.authority })).resolves.toMatchObject({
      head: outcome.snapshot.head,
      portfolio: { records: [record] },
      metadata: [{ recordId: record.recordId, localId, label }]
    });
    coordinator.close();
  });

  it("uses fresh Mode 2 material and re-encrypts retained metadata for every rewrite", async () => {
    const { database, coordinator, holder, service } = await fixture();
    const initial = await service.initialize({ authority: holder.authority });
    const first = futureRecord(2, "first secret");
    const firstResult = await service.rewrite({
      authority: holder.authority,
      expectedHead: initial.head,
      change: { upsert: first },
      metadataChange: { upsert: { recordId: first.recordId, localId: "local-2", label: "First" } }
    });
    if (firstResult.result !== "committed") throw new Error("expected first commit");
    const metadataAfterFirst = (await createRepository<StoredEncryptedRecord>(database, "records").all())[0];

    const second = futureRecord(3, "second secret");
    const secondResult = await service.rewrite({
      authority: holder.authority,
      expectedHead: firstResult.snapshot.head,
      change: { upsert: second }
    });
    if (secondResult.result !== "committed") throw new Error("expected second commit");

    const versions = (await createRepository<StoredPortfolioVersion>(database, "portfolio").all())
      .sort((left, right) => left.version - right.version);
    expect(versions).toHaveLength(3);
    for (let index = 1; index < versions.length; index += 1) {
      const prior = versions[index - 1];
      const current = versions[index];
      expect(current.manifest.privacy.parameters.iv).not.toBe(prior.manifest.privacy.parameters.iv);
      expect(current.manifest.privacy.parameters.ephemeralPublicKey)
        .not.toBe(prior.manifest.privacy.parameters.ephemeralPublicKey);
      expect(current.manifest.privacy.parameters.recipients[0].id)
        .not.toBe(prior.manifest.privacy.parameters.recipients[0].id);
      expect(current.manifest.content.hash).not.toBe(prior.manifest.content.hash);
      expect(current.ciphertext).not.toEqual(prior.ciphertext);
      expect(current.previousHead).toBe(prior.head);
    }
    const metadataAfterSecond = (await createRepository<StoredEncryptedRecord>(database, "records").all())[0];
    expect(metadataAfterSecond.reference).toBe(metadataAfterFirst.reference);
    expect(metadataAfterSecond.iv).not.toBe(metadataAfterFirst.iv);
    expect(metadataAfterSecond.ciphertextHash).not.toBe(metadataAfterFirst.ciphertextHash);
    expect(metadataAfterSecond.ciphertext).not.toEqual(metadataAfterFirst.ciphertext);
    expect(secondResult.snapshot.portfolio.records).toEqual([first, second]);
    expect(secondResult.snapshot.metadata).toMatchObject([{ recordId: first.recordId, label: "First" }]);
    coordinator.close();
  });

  it("preserves well-formed unknown record kinds through unrelated updates and deletion", async () => {
    const { coordinator, holder, service } = await fixture();
    const initial = await service.initialize({ authority: holder.authority });
    const unknown = futureRecord(4, "opaque future payload");
    const first = await service.rewrite({
      authority: holder.authority,
      expectedHead: initial.head,
      change: { upsert: unknown }
    });
    if (first.result !== "committed") throw new Error("expected first commit");
    const other = futureRecord(5, "other payload");
    const second = await service.rewrite({
      authority: holder.authority,
      expectedHead: first.snapshot.head,
      change: { upsert: other }
    });
    if (second.result !== "committed") throw new Error("expected second commit");
    expect(second.snapshot.portfolio.records).toEqual([unknown, other]);

    const removed = await service.rewrite({
      authority: holder.authority,
      expectedHead: second.snapshot.head,
      change: { removeRecordId: other.recordId }
    });
    if (removed.result !== "committed") throw new Error("expected removal commit");
    expect(removed.snapshot.portfolio.records).toEqual([unknown]);
    coordinator.close();
  });

  it("rejects divergent heads atomically, records the conflict, and permits explicit resolution", async () => {
    const { database, coordinator, holder, service } = await fixture();
    const initial = await service.initialize({ authority: holder.authority });
    const committed = await service.rewrite({
      authority: holder.authority,
      expectedHead: initial.head,
      change: { upsert: futureRecord(6, "winning update") }
    });
    if (committed.result !== "committed") throw new Error("expected winning commit");
    const versionCount = (await createRepository<StoredPortfolioVersion>(database, "portfolio").all()).length;

    const stale = await service.rewrite({
      authority: holder.authority,
      expectedHead: initial.head,
      change: { upsert: futureRecord(7, "stale update") }
    });
    expect(stale).toEqual({ result: "conflict", baseHead: initial.head, currentHead: committed.snapshot.head });
    expect(await createRepository<StoredPortfolioVersion>(database, "portfolio").all()).toHaveLength(versionCount);
    const conflicted = await service.load({ authority: holder.authority });
    expect(conflicted.conflict).toEqual({
      state: "divergent",
      attemptedBaseHead: initial.head,
      currentHead: committed.snapshot.head,
      detectedAt: NOW
    });
    expect(conflicted.portfolio.records.some(value => value.recordId === randomId(7))).toBe(false);

    const resolved = await service.rewrite({
      authority: holder.authority,
      expectedHead: committed.snapshot.head,
      change: { upsert: futureRecord(8, "resolved update") }
    });
    if (resolved.result !== "committed") throw new Error("expected resolution commit");
    expect(resolved.snapshot.conflict).toEqual({ state: "none" });
    coordinator.close();
  });

  it("fails closed on ciphertext, authenticator, metadata, and rollback corruption", async () => {
    const ciphertextFixture = await fixture();
    const initial = await ciphertextFixture.service.initialize({ authority: ciphertextFixture.holder.authority });
    const versions = createRepository<StoredPortfolioVersion>(ciphertextFixture.database, "portfolio");
    const current = (await versions.all())[0];
    const changedCiphertext = new Uint8Array(current.ciphertext);
    changedCiphertext[0] ^= 0xff;
    await versions.put({ ...current, ciphertext: changedCiphertext });
    await expect(ciphertextFixture.service.load({ authority: ciphertextFixture.holder.authority }))
      .rejects.toMatchObject({ code: "RHP_PORTFOLIO_CORRUPT" });
    ciphertextFixture.coordinator.close();

    const authenticationFixture = await fixture();
    await authenticationFixture.service.initialize({ authority: authenticationFixture.holder.authority });
    const authenticationVersions = createRepository<StoredPortfolioVersion>(authenticationFixture.database, "portfolio");
    const authenticated = (await authenticationVersions.all())[0];
    await authenticationVersions.put({
      ...authenticated,
      authentication: { ...authenticated.authentication, value: encodeBase64Url(new Uint8Array(32)) }
    });
    await expect(authenticationFixture.service.load({ authority: authenticationFixture.holder.authority }))
      .rejects.toMatchObject({ code: "RHP_STORAGE_CORRUPT" });
    authenticationFixture.coordinator.close();

    const metadataFixture = await fixture();
    const empty = await metadataFixture.service.initialize({ authority: metadataFixture.holder.authority });
    const withMetadata = await metadataFixture.service.rewrite({
      authority: metadataFixture.holder.authority,
      expectedHead: empty.head,
      change: { upsert: futureRecord(9, "metadata target") },
      metadataChange: { upsert: { recordId: randomId(9), localId: "metadata-local", notes: "protected" } }
    });
    if (withMetadata.result !== "committed") throw new Error("expected metadata commit");
    const recordRepository = createRepository<StoredEncryptedRecord>(metadataFixture.database, "records");
    const encryptedMetadata = (await recordRepository.all())[0];
    const changedMetadata = new Uint8Array(encryptedMetadata.ciphertext);
    changedMetadata[0] ^= 0xff;
    await recordRepository.put({ ...encryptedMetadata, ciphertext: changedMetadata });
    await expect(metadataFixture.service.load({ authority: metadataFixture.holder.authority }))
      .rejects.toMatchObject({ code: "RHP_PORTFOLIO_CORRUPT" });
    metadataFixture.coordinator.close();

    const rollbackFixture = await fixture();
    const v1 = await rollbackFixture.service.initialize({ authority: rollbackFixture.holder.authority });
    const v2 = await rollbackFixture.service.rewrite({
      authority: rollbackFixture.holder.authority,
      expectedHead: v1.head,
      change: { upsert: futureRecord(10, "newer state") }
    });
    if (v2.result !== "committed") throw new Error("expected newer commit");
    const rollbackVersions = (await createRepository<StoredPortfolioVersion>(rollbackFixture.database, "portfolio").all())
      .sort((left, right) => left.version - right.version);
    const headRepository = createRepository<StoredPortfolioHead>(rollbackFixture.database, "heads");
    const headId = `${PORTFOLIO_HEAD_PREFIX}hiri://${rollbackFixture.holder.authority}/data/passport-main`;
    const head = await headRepository.get(headId);
    await headRepository.put({
      ...head!,
      currentHead: rollbackVersions[0].head,
      version: 1,
      updatedAt: rollbackVersions[0].storedAt,
      authentication: rollbackVersions[0].authentication,
      conflict: { state: "none" }
    });
    await expect(rollbackFixture.service.load({ authority: rollbackFixture.holder.authority }))
      .rejects.toMatchObject({ code: "RHP_STORAGE_CORRUPT" });
    rollbackFixture.coordinator.close();
    expect(initial.version).toBe(1);
  });

  it("does not persist work cancelled before the transaction boundary", async () => {
    const { database, coordinator, holder, service } = await fixture();
    const initial = await service.initialize({ authority: holder.authority });
    const controller = new AbortController();
    controller.abort(new DOMException("cancelled", "AbortError"));
    await expect(service.rewrite({
      authority: holder.authority,
      expectedHead: initial.head,
      change: { upsert: futureRecord(11, "must not persist") },
      signal: controller.signal
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(await createRepository<StoredPortfolioVersion>(database, "portfolio").all()).toHaveLength(1);
    expect((await service.load({ authority: holder.authority })).portfolio.records).toEqual([]);
    coordinator.close();
  });

  it("refuses synthetic storage composition and missing portfolios with safe errors", async () => {
    const database = createPassportDatabase({ profile: "synthetic-demo", factory: new IDBFactory() });
    const coordinator = createStorageCoordinator({ database, ownerId: "synthetic-refusal" });
    await coordinator.start();
    const keyService = {
      database,
      list: async () => [],
      derive: async () => new Uint8Array()
    };
    expect(() => createPortfolioService({
      database,
      coordinator,
      keyService: keyService as never
    })).toThrow(/real-holder-preview/u);
    coordinator.close();

    const preview = await fixture();
    await expect(preview.service.load({ authority: preview.holder.authority }))
      .rejects.toBeInstanceOf(PortfolioServiceError);
    await expect(preview.service.load({ authority: preview.holder.authority }))
      .rejects.toMatchObject({ code: "RHP_PORTFOLIO_NOT_FOUND" });
    preview.coordinator.close();
  });
});
