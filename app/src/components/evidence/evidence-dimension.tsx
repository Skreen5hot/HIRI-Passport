import type { EvidenceState, PolicyState } from "../../types";

export function EvidenceDimension({ label, value, detail }: { label: string; value: EvidenceState | PolicyState | string; detail?: string }) {
  const className = value === "valid" || value === "active" || value === "accepted" ? "valid" : value === "invalid" || value === "revoked" || value === "rejected" ? "invalid" : "";
  return <div className="evidence-row"><span><i className={`status-dot ${className}`} aria-hidden="true" />{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
