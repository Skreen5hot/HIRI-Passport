import { repository } from "./repositories";
export type HeadEntry = { id: string; version: number; manifestHash: string; source: string; retrievedAt: string; transportAuthenticated: boolean; issuerAuthoritative: boolean; rollbackExplanationVerified?: boolean };
const heads = repository<HeadEntry>("heads");
export function createHeadCache() { return Object.freeze({ get: heads.get, async put(entry: HeadEntry) { const previous = await heads.get(entry.id); if (previous && entry.version < previous.version && entry.rollbackExplanationVerified !== true) throw new Error("authenticated head rollback rejected"); await heads.put(entry); return entry; } }); }
