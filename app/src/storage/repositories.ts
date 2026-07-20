import { transaction } from "./database";
import type { StoreName } from "./schema";

export function repository<T extends { id: string }>(store: StoreName) {
  return Object.freeze({
    get: (id: string) => transaction<T | undefined>(store, "readonly", value => value.get(id)),
    put: (value: T) => transaction<IDBValidKey>(store, "readwrite", target => target.put(structuredClone(value))),
    delete: (id: string) => transaction<undefined>(store, "readwrite", target => target.delete(id)),
    all: () => transaction<T[]>(store, "readonly", target => target.getAll())
  });
}
