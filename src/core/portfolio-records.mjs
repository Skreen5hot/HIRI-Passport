import { encryptPortfolio } from "./portfolio-crypto.mjs";
import { parseAbsoluteUri, parseEd25519Authority, parseRandomId, parseSha256Identifier, parseUtcSeconds } from "./scalars.mjs";

export function validatePortfolioPlaintext(value, authority) {
  parseEd25519Authority(authority);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("portfolio plaintext must be an object");
  if (value["@type"] !== "hiri:passport:EncryptedPortfolio" || value.schemaVersion !== "2.0" || value.holderAuthority !== authority || !Array.isArray(value.records)) {
    throw new TypeError("invalid encrypted portfolio root");
  }
  const ids = new Set();
  for (const record of value.records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new TypeError("portfolio record must be an object");
    parseRandomId(record.recordId);
    if (ids.has(record.recordId)) throw new TypeError("duplicate private recordId");
    ids.add(record.recordId);
    if (record.addedAt != null) parseUtcSeconds(record.addedAt);
    if (record.kind === "issuerCredential") {
      parseAbsoluteUri(record.credential?.uri, { allowFragment: false });
      parseSha256Identifier(record.credential?.manifestHash);
    }
  }
  return value;
}

export function applyPortfolioRecordChange(portfolio, change) {
  const next = structuredClone(portfolio);
  if (change?.removeRecordId) next.records = next.records.filter((record) => record.recordId !== change.removeRecordId);
  if (change?.upsert) {
    const index = next.records.findIndex((record) => record.recordId === change.upsert.recordId);
    if (index >= 0) next.records[index] = structuredClone(change.upsert);
    else next.records.push(structuredClone(change.upsert));
  }
  validatePortfolioPlaintext(next, next.holderAuthority);
  return next;
}

export async function preparePortfolioRewrite({ baseHead, currentHead, portfolio, recipients, publish = true }, ports) {
  validatePortfolioPlaintext(portfolio, portfolio.holderAuthority);
  if (baseHead != null && currentHead != null && baseHead !== currentHead) {
    return { result: "conflict", error: "PORTFOLIO_CONFLICT", baseHead, currentHead };
  }
  if (!publish) return { result: "local", portfolio: structuredClone(portfolio) };
  const encrypted = await encryptPortfolio({ holderAuthority: portfolio.holderAuthority, plaintext: portfolio, recipients }, ports);
  return { result: "prepared", previousHead: currentHead ?? baseHead ?? null, encrypted };
}
