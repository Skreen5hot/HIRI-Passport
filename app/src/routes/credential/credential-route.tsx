import { useAppState } from "../../state/app-state";
import { CredentialDetail } from "./credential-detail";
export function CredentialRoute() { const { credentials } = useAppState(); const id = new URLSearchParams(window.location.hash.split("?", 2)[1] ?? "").get("id"); const record = credentials.find(candidate => candidate.recordId === id) ?? credentials[0]; return record ? <CredentialDetail record={record} /> : <section className="panel"><h1>Credential not found</h1></section>; }
