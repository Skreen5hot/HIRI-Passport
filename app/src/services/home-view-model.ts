import type { CredentialRecord } from "../types";

export function buildHomeViewModel(records: CredentialRecord[]) {
  return {
    total: records.length,
    active: records.filter(record => record.status === "active").length,
    attention: records.filter(record => [record.status, record.cryptography, record.issuerIdentity].includes("invalid")).length,
    records: [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  };
}
