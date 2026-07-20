import { parseEd25519Authority, parseUtcSeconds } from "./scalars.mjs";

export function evaluateIssuerIdentity(issuerAuthority, anchors, at) {
  parseEd25519Authority(issuerAuthority); parseUtcSeconds(at);
  const candidates = Array.isArray(anchors) ? anchors.filter((anchor) => anchor.authority === issuerAuthority) : [];
  if (!candidates.length) return { result: "unknown", issuerAuthority, anchors: [] };
  const evidence = candidates.map((anchor) => ({ type: anchor.type, source: anchor.source, capturedAt: anchor.capturedAt, result: anchor.result ?? "unknown", organization: anchor.organization }));
  return { result: evidence.some((item) => item.result === "valid") ? "valid" : evidence.some((item) => item.result === "invalid") ? "invalid" : "unknown", issuerAuthority, anchors: evidence };
}

export function evaluatePolicy(evidence, policy) {
  if (!policy) return { result: "not-evaluated" };
  if (typeof policy.id !== "string" || typeof policy.version !== "string" || typeof policy.evaluate !== "function") throw new TypeError("policy requires id, version, and evaluate");
  const decision = policy.evaluate(structuredClone(evidence));
  if (!decision || !["accepted", "rejected", "not-evaluated"].includes(decision.result)) throw new TypeError("invalid policy result");
  const reasons = decision.reasons ?? [];
  for (const reason of reasons) if (!reason || (!Array.isArray(reason.evidencePaths) && typeof reason.predicate !== "string")) throw new TypeError("policy reason must link evidence or predicate");
  return Object.freeze({ result: decision.result, policyId: policy.id, policyVersion: policy.version, reasons: structuredClone(reasons) });
}
