import type { CredentialRecord } from "../../types";
import { EvidenceDimension } from "./evidence-dimension";
export function EvidenceSummary({ record }: { record: CredentialRecord }) { return <div className="evidence-grid"><EvidenceDimension label="Cryptography" value={record.cryptography} /><EvidenceDimension label="Credential status" value={record.status} /><EvidenceDimension label="Issuer identity" value={record.issuerIdentity} /><EvidenceDimension label="Provenance" value={record.provenance} /><EvidenceDimension label="Policy" value={record.policy} /></div>; }
