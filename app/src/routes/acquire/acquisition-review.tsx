import { EvidenceDimension } from "../../components/evidence/evidence-dimension";
import { SafeText, safeExternalText } from "../../security/safe-text";
import type {
  AcquisitionEvidenceSet,
  AcquisitionInspection
} from "../../services/acquisition-service";

const DIMENSIONS: readonly Readonly<{
  key: keyof AcquisitionEvidenceSet;
  label: string;
}>[] = Object.freeze([
  { key: "structure", label: "Structure" },
  { key: "resourceAvailability", label: "Pinned resources" },
  { key: "contentHash", label: "Content binding" },
  { key: "signature", label: "Signature" },
  { key: "methodAuthorization", label: "Signing method" },
  { key: "chain", label: "Version chain" },
  { key: "schema", label: "Schema" },
  { key: "subjectBinding", label: "Subject binding" },
  { key: "status", label: "Current status" },
  { key: "issuerIdentity", label: "Issuer identity" },
  { key: "bvsProfile", label: "BVS evidence profile" },
  { key: "bvsIdentity", label: "BVS identity" },
  { key: "policy", label: "Policy" },
  { key: "cryptography", label: "Overall cryptography" }
]);

function resultMessage(inspection: AcquisitionInspection): string {
  if (inspection.code === "RHP_ACQUISITION_RESOURCES_UNAVAILABLE") {
    return "Inspection is blocked because the independently reviewed, hash-pinned preview resource package is not installed.";
  }
  if (inspection.code === "RHP_ACQUISITION_UNSUPPORTED") {
    return "The JSON is not an exact local manifest/content pair or a Passport Presentation Package.";
  }
  if (inspection.result === "blocked") {
    return "Inspection found invalid or malformed evidence. The artifact cannot be activated.";
  }
  return "The artifact was inspected locally. It remains inspection-only and cannot be added to this preview.";
}

export function AcquisitionReview({
  inspection,
  onBack
}: Readonly<{
  inspection: AcquisitionInspection;
  onBack(): void;
}>) {
  const sourceName = inspection.provenance.fileName
    ? safeExternalText(inspection.provenance.fileName, 255)
    : "Pasted JSON";
  const item = inspection.items[0];

  return <section className="panel stack" aria-labelledby="acquisition-review-heading">
    <div role={inspection.result === "blocked" ? "alert" : "status"}>
      <p className="eyebrow">Local evidence inspection</p>
      <h2 id="acquisition-review-heading">
        {inspection.result === "blocked" ? "Inspection blocked" : "Inspection only"}
      </h2>
      <p className="lede">{resultMessage(inspection)}</p>
    </div>

    <div className="panel stack" aria-label="Import provenance">
      <h2>Import provenance</h2>
      <p><SafeText>{sourceName}</SafeText></p>
      <p className="technical">Source: {inspection.provenance.source} · Bytes: {inspection.provenance.originalByteLength}</p>
      <p className="technical">Import SHA-256: {inspection.importHash || "unavailable"}</p>
      <p className="small muted">Transport authentication: not established · Network access: disabled · Persistence: not performed</p>
    </div>

    {item && (item.credentialType || item.issuerAuthority) && <div className="panel stack" aria-label="Credential identifiers">
      <h2>Credential identifiers</h2>
      {item.credentialType && <p>Type: <SafeText>{safeExternalText(item.credentialType)}</SafeText></p>}
      {item.issuerAuthority && <p className="technical">Issuer authority: <SafeText>{safeExternalText(item.issuerAuthority, 1024)}</SafeText></p>}
      <p className="small muted">Declared provenance: {item.provenance}. No issuer credential is trusted or preview-issued.</p>
    </div>}

    <section className="stack" aria-labelledby="acquisition-evidence-heading">
      <h2 id="acquisition-evidence-heading">Independent evidence dimensions</h2>
      <div className="evidence-grid">
        {DIMENSIONS.map(({ key, label }) => <EvidenceDimension
          key={key}
          label={label}
          value={inspection.evidence[key].state}
          detail={inspection.evidence[key].code}
        />)}
      </div>
    </section>

    <section className="panel stack" aria-labelledby="status-limitation-heading">
      <h2 id="status-limitation-heading">Status limitation</h2>
      <p>This preview does not check whether a credential is currently valid. Credential status will show as "unknown." The protocol can report a real status — active, suspended, revoked, expired, or superseded — but only when a verifier is configured with a source it trusts as authoritative for that credential, and every required check succeeds. This preview configures no such source. Do not rely on it to determine whether a credential has been revoked.</p>
      <p>Policy is not evaluated.</p>
    </section>

    <div className="actions">
      <button className="button secondary" type="button" onClick={onBack}>Inspect another file</button>
    </div>
  </section>;
}
