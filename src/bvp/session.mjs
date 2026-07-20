import { parseUtcSeconds } from "../core/scalars.mjs";

const SECRET = /(?:token|password|cookie|biometric|documentImage|privateResponse|secret|fingerprint)/iu;

function assertNoRawSecrets(value, path = "") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) { if (SECRET.test(key)) throw new TypeError(`raw source secret prohibited at ${path}/${key}`); assertNoRawSecrets(child, `${path}/${key}`); }
}

export function createBvsSession(challenge) {
  if (!challenge?.sessionId || !Array.isArray(challenge.intents)) throw new TypeError("validated challenge required");
  return { sessionId: challenge.sessionId, challenge: structuredClone(challenge), holderAuthority: challenge.holderAuthority, intents: Object.fromEntries(challenge.intents.map((intent) => [intent.intentId, structuredClone(intent)])), transcripts: {}, holderBinding: null, consumed: false, finalized: false };
}

export function attachSourceTranscript(session, intentId, transcript, adapter) {
  if (session.finalized) throw new Error("session already finalized"); const intent = session.intents[intentId]; if (!intent) throw new TypeError("transcript intent is not authorized");
  if (intent.adapterId !== adapter.id || intent.adapterVersion !== adapter.version || transcript.intentId !== intentId) throw new TypeError("source transcript adapter or intent mismatch");
  assertNoRawSecrets(transcript);
  for (const name of ["sourceObservedAt", "checksCompletedAt"]) parseUtcSeconds(transcript[name]);
  if (typeof transcript.adapterImplementationVersion !== "string" || !transcript.adapterImplementationVersion.length) throw new TypeError("adapter implementation version required");
  const result = transcript.authenticated !== true ? "unknown" : transcript.ambiguous === true || transcript.profileContradiction === true || transcript.subjectBinding !== "valid" ? "invalid" : "valid";
  session.transcripts[intentId] = { result, intentId, sourceProvider: intent.sourceProvider, sourceVerificationMethod: intent.sourceVerificationMethod, adapterId: adapter.id, adapterVersion: adapter.version, adapterImplementationVersion: transcript.adapterImplementationVersion, sourceSubjectType: transcript.sourceSubjectType, sourceObservedAt: transcript.sourceObservedAt, checksCompletedAt: transcript.checksCompletedAt, claims: structuredClone(transcript.claims ?? {}), checks: structuredClone(transcript.checks ?? []) };
  return session.transcripts[intentId];
}

export function authorizeHolderResponse(session, response) {
  if (session.consumed) throw new Error("holder-binding response replayed");
  if (response.sessionId !== session.sessionId || response.challengeId !== session.challenge.challengeId || response.nonce !== session.challenge.nonce || response.holder?.authority !== session.holderAuthority) throw new TypeError("holder-binding response mismatch");
  if (!Array.isArray(response.authorizedIntentIds) || response.authorizedIntentIds.some((id) => !session.intents[id])) throw new TypeError("unauthorized intent");
  session.holderBinding = { response: structuredClone(response), authorizedIntentIds: [...response.authorizedIntentIds], result: "valid", expiresAt: response.expiresAt }; session.consumed = true; return session.holderBinding;
}

export function finalizeVerifiedSession(session, now) {
  if (!session.holderBinding || session.holderBinding.result !== "valid") return { result: "prohibited", error: "BVP_INTENT_UNAUTHORIZED" };
  const evaluation = typeof now === "number" ? now : parseUtcSeconds(now); if (parseUtcSeconds(session.holderBinding.expiresAt) < evaluation) return { result: "prohibited", error: "BVP_MESSAGE_EXPIRED" };
  for (const id of session.holderBinding.authorizedIntentIds) { const transcript = session.transcripts[id]; if (!transcript || transcript.result !== "valid") return { result: "prohibited", error: transcript?.result === "invalid" ? "BVP_SOURCE_EVIDENCE_INVALID" : "BVP_SOURCE_EVIDENCE_UNKNOWN" }; }
  session.finalized = true; session.finalizedAt = typeof now === "string" ? now : new Date(now).toISOString().replace(".000Z", "Z"); return { result: "verified", session };
}
