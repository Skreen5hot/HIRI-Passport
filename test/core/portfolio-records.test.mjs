import test from "node:test";
import assert from "node:assert/strict";
import { deriveAuthority } from "../../src/core/authority.mjs";
import { encodeBase64Url } from "../../src/core/scalars.mjs";
import { applyPortfolioRecordChange, preparePortfolioRewrite, validatePortfolioPlaintext } from "../../src/core/portfolio-records.mjs";

// Core §7.4, Core §7.5
const authority = deriveAuthority(new Uint8Array(32));
const portfolio = { "@type": "hiri:passport:EncryptedPortfolio", schemaVersion: "2.0", holderAuthority: authority, records: [{ recordId: encodeBase64Url(new Uint8Array(16)), kind: "futureRecord", opaque: { keep: true } }] };

test("unknown record kinds survive rewrites", () => {
  validatePortfolioPlaintext(portfolio, authority);
  const next = applyPortfolioRecordChange(portfolio, { upsert: { recordId: encodeBase64Url(new Uint8Array(16).fill(1)), kind: "futureRecord", opaque: 2 } });
  assert.equal(next.records[0].opaque.keep, true);
  assert.equal(next.records.length, 2);
});

test("divergent heads fail instead of discarding records", async () => {
  const result = await preparePortfolioRewrite({ baseHead: "a", currentHead: "b", portfolio, recipients: [] }, {});
  assert.equal(result.result, "conflict");
  assert.equal((await preparePortfolioRewrite({ portfolio, publish: false }, {})).result, "local");
});
