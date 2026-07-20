export const DATABASE_NAME = "hiri-passport:pwa";
export const DATABASE_VERSION = 1;
export const STORES = Object.freeze(["keys", "portfolio", "records", "resources", "heads", "replay", "authorizations", "history", "settings", "migrations"] as const);
export type StoreName = typeof STORES[number];
