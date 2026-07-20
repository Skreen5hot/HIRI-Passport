import type { CredentialRecord } from "../../types";
import { StatusProvenance } from "../../components/evidence/status-provenance";
export function EvidenceView({ record }: { record: CredentialRecord }) { return <section className="panel"><p className="eyebrow">What this establishes</p><h2>{record.cryptography === "valid" ? "Signature control verified" : "Evidence incomplete"}</h2><p className="muted">Organizational identity, current status, provenance, and local policy remain separate conclusions.</p><StatusProvenance record={record} /></section>; }
