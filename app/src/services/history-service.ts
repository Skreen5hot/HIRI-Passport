import type { PrivacyEvent } from "../types";
import { repository } from "../storage/repositories";

type StoredHistory = PrivacyEvent & { id: string };
const history = repository<StoredHistory>("history");
export const historyService = Object.freeze({ list: () => history.all(), record: (event: PrivacyEvent) => history.put(event), remove: (id: string) => history.delete(id), clear: async () => { for (const event of await history.all()) await history.delete(event.id); } });
