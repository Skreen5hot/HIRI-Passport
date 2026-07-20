import type { CredentialRecord } from "../../types";
import { EvidenceSummary } from "../../components/evidence/evidence-summary";
import { TechnicalDetails } from "../../components/evidence/technical-details";
import { ClaimView } from "./claim-view";
import { EvidenceView } from "./evidence-view";
export function CredentialDetail({ record }: { record: CredentialRecord }) { return <section className="stack"><header><p className="eyebrow">{record.provenance}</p><h1>{record.title}</h1><p className="lede">Issued by {record.issuer}. {record.publicContent ? "Presenting public mode transfers the complete claim." : "Stored privately by default."}</p></header><EvidenceSummary record={record} /><div className="grid"><ClaimView record={record} /><EvidenceView record={record} /></div><TechnicalDetails record={record} /></section>; }
