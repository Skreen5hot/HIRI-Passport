import { repository } from "./repositories";
const values = repository<{ id: string; expiresAt: number }>("replay");
export function replayKey(requestId: string, nonce: string) { return `${requestId}\u0000${nonce}`; }
export function createPersistentReplayStore(now: () => number) {
  return Object.freeze({
    async has(id: string) { const value = await values.get(id); if (!value) return false; if (value.expiresAt < now()) { await values.delete(id); return false; } return true; },
    async put(id: string, expiresAt: number) { if (await this.has(id)) throw new Error("replay detected"); await values.put({ id, expiresAt }); }
  });
}
