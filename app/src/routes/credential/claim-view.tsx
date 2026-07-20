import type { CredentialRecord } from "../../types";
import { SafeText } from "../../security/safe-text";
export function ClaimView({ record }: { record: CredentialRecord }) { return <section className="panel"><p className="eyebrow">Complete claim</p><dl className="claim-list">{Object.entries(record.claims).map(([name, value]) => <div key={name}><dt>{name}</dt><dd><SafeText>{value}</SafeText></dd></div>)}</dl></section>; }
