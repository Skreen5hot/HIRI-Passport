import { parseUtcSeconds } from "./scalars.mjs";
import { validateCredentialClaim } from "./credential.mjs";

const TERMINAL = new Set(["revoked", "superseded"]);

export function validateCredentialVersion(previous, current) {
  const currentValidation = validateCredentialClaim(current, { genesis: previous == null });
  if (currentValidation.result !== "valid") return currentValidation;
  if (!previous) return { result: "valid" };
  const previousValidation = validateCredentialClaim(previous, { genesis: false });
  if (previousValidation.result !== "valid") return previousValidation;
  if (current.issuanceDate !== previous.issuanceDate || current.subjectHolderAuthority !== previous.subjectHolderAuthority) {
    return { result: "invalid", error: "HIRI_CHAIN_INVALID" };
  }
  if (parseUtcSeconds(current.status.effectiveAt) < parseUtcSeconds(current.issuanceDate)) return { result: "invalid", error: "STATUS_TRANSITION_INVALID" };
  if (TERMINAL.has(previous.status.state) && ["active", "suspended"].includes(current.status.state)) return { result: "invalid", error: "STATUS_TRANSITION_INVALID" };
  return { result: "valid" };
}

export function deriveIssuerState(chain, evaluationTime, issuanceToleranceSeconds = 0) {
  if (!Array.isArray(chain) || !chain.length) return { result: "unknown", error: "CURRENT_HEAD_UNKNOWN" };
  const now = typeof evaluationTime === "number" ? evaluationTime : parseUtcSeconds(evaluationTime);
  let terminalSeen = false;
  const effective = [];
  for (let index = 0; index < chain.length; index += 1) {
    const validation = validateCredentialVersion(index ? chain[index - 1].content : null, chain[index].content);
    if (validation.result !== "valid") return { result: "unknown", error: validation.error ?? "HIRI_CHAIN_INVALID", statusChain: "invalid" };
    const state = chain[index].content.status.state;
    if (terminalSeen && ["active", "suspended"].includes(state)) return { result: "unknown", error: "STATUS_TRANSITION_INVALID", statusChain: "invalid" };
    if (TERMINAL.has(state)) terminalSeen = true;
    const at = parseUtcSeconds(chain[index].content.status.effectiveAt);
    const boundary = index === 0 ? now + issuanceToleranceSeconds * 1000 : now;
    if (at <= boundary) effective.push({ state, at, version: BigInt(chain[index].version), content: chain[index].content });
  }
  if (!effective.length) return { result: "invalid", error: "CREDENTIAL_NOT_YET_VALID", status: "unknown" };
  effective.sort((left, right) => left.at === right.at ? (left.version < right.version ? -1 : left.version > right.version ? 1 : 0) : left.at - right.at);
  return { result: "valid", issuerState: effective.at(-1).state, content: effective.at(-1).content };
}
