import { DATABASE_VERSION } from "./schema";
export type MigrationState = { from: number; to: number; status: "planned" | "applied" | "blocked" };
export function planMigration(from: number, to = DATABASE_VERSION): MigrationState {
  if (!Number.isSafeInteger(from) || from < 0 || from > to) throw new RangeError("database downgrade is prohibited");
  return { from, to, status: from === to ? "applied" : "planned" };
}
