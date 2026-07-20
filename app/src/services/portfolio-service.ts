import type { CredentialRecord } from "../types";
import { repository } from "../storage/repositories";

type StoredRecord = CredentialRecord & { id: string };
const records = repository<StoredRecord>("records");

export const portfolioService = Object.freeze({
  list: async () => (await records.all()).map(({ id: _id, ...record }) => record),
  get: async (recordId: string) => {
    const value = await records.get(recordId);
    if (!value) return undefined;
    const { id: _id, ...record } = value;
    return record;
  },
  save: (record: CredentialRecord) => records.put({ ...record, id: record.recordId }),
  remove: (recordId: string) => records.delete(recordId)
});
