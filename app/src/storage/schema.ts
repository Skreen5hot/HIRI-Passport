export type StorageProfile = "synthetic-demo" | "real-holder-preview";

export const DATABASE_NAMES = Object.freeze({
  // Preserve the deployed synthetic prototype name so its v1 state upgrades in
  // place; real holder state always uses the dedicated preview database below.
  "synthetic-demo": "hiri-passport:pwa",
  "real-holder-preview": "hiri-passport:real-holder-preview"
} satisfies Record<StorageProfile, string>);

/** Compatibility alias for synthetic-only services that have not been ported yet. */
export const DATABASE_NAME = DATABASE_NAMES["synthetic-demo"];
export const DATABASE_VERSION = 2;

export const STORES = Object.freeze([
  "keys",
  "portfolio",
  "records",
  "resources",
  "heads",
  "replay",
  "authorizations",
  "history",
  "settings",
  "migrations",
  "leases"
] as const);

export const VERSION_ONE_STORES = Object.freeze(STORES.filter(store => store !== "leases"));
export const SCHEMA_METADATA_ID = "__hiri_storage_schema__";

export type StoreName = typeof STORES[number];

export function databaseNameFor(profile: StorageProfile): string {
  return DATABASE_NAMES[profile];
}
