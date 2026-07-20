import { validateDisclosureRequest } from "./disclosure-request.mjs";

export function requestReplayKey(request) {
  return `${request.verifier.authority}\u0000${request.requestId}\u0000${request.nonce}`;
}

export function evaluateRequestForConsent(request, evidence, now, parameters = {}) {
  try {
    validateDisclosureRequest(request, now, parameters);
  } catch (error) {
    return { result: "invalid", eligible: false, error: { code: "MESSAGE_MALFORMED", path: "", description: "The request is not valid." } };
  }
  if (evidence?.signature !== "valid" || evidence?.methodAuthorization !== "valid") return { result: evidence?.signature === "invalid" || evidence?.methodAuthorization === "invalid" ? "invalid" : "unknown", eligible: false };
  const fields = request.credentialRequests.flatMap((item) => item.fields.map((field) => ({ requestItemId: item.requestItemId, kind: "credential", schema: item.schema, path: field.path, purpose: field.purpose, required: item.required || field.required, provenance: evidence?.provenance?.[item.requestItemId] ?? "unknown" }))).concat(request.selfAssertionRequests.map((item) => ({ requestItemId: item.requestItemId, kind: "self-assertion", schema: item.schema, path: item.path, purpose: item.purpose, required: item.required, provenance: "self-asserted-ephemeral" })));
  return { result: "valid", eligible: true, verifier: { hints: request.verifier.display ?? null, identityEvidence: evidence?.verifierIdentity ?? { result: "unknown" } }, fields };
}

export function acceptRequest({ request, selectedOptionalItems = [] }, replayStore) {
  const selected = new Set(selectedOptionalItems);
  const known = new Set([...request.credentialRequests, ...request.selfAssertionRequests].map((item) => item.requestItemId));
  for (const item of selected) if (!known.has(item)) throw new TypeError("selected item is not part of request");
  const key = requestReplayKey(request);
  if (!replayStore || typeof replayStore.has !== "function" || typeof replayStore.put !== "function") throw new TypeError("persistent replay store is required");
  if (replayStore.has(key)) throw new Error("request replayed");
  const skew = replayStore.messageClockSkewSeconds ?? 0;
  replayStore.put(key, Date.parse(request.expiresAt) + skew * 1000);
  const acceptedItemIds = [...request.credentialRequests, ...request.selfAssertionRequests].filter((item) => item.required || selected.has(item.requestItemId)).map((item) => item.requestItemId);
  return Object.freeze({ type: "one-presentation-authorization", requestId: request.requestId, nonce: request.nonce, verifierAuthority: request.verifier.authority, expiresAt: request.expiresAt, acceptedItemIds: Object.freeze(acceptedItemIds), disclosureModes: Object.freeze({ public: true }), consumedPresentation: null });
}

export function declineRequest(requestId) { return Object.freeze({ requestId, decision: "declined", authorization: null }); }
