import type { CredentialRecord } from "../../types";
export function StatusProvenance({ record }: { record: CredentialRecord }) { return <p className="small muted">Status: <b>{record.status}</b> · evidence evaluated {new Date(record.updatedAt).toLocaleString()} · provenance {record.provenance}</p>; }
