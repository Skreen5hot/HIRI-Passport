const STATES = new Set(["valid", "invalid", "unknown", "not-applicable"]);

function state(value, fallback = "unknown") {
  const result = typeof value === "string" ? value : value?.result;
  return STATES.has(result) ? result : fallback;
}

function summarize(required) {
  const values = Object.values(required);
  if (values.includes("invalid")) return "invalid";
  if (values.includes("unknown")) return "unknown";
  if (values.every((value) => value === "not-applicable")) return "not-applicable";
  return "valid";
}

export function verifyRequestPhase(input) {
  const request = input.request;
  const presentation = input.presentation;
  const binding = !request || !presentation ? "unknown" : presentation.requestBinding?.requestId === request.requestId && presentation.requestBinding?.nonce === request.nonce && presentation.requestBinding?.verifierAuthority === request.verifier?.authority ? "valid" : "invalid";
  const requested = new Map([...(request?.credentialRequests ?? []), ...(request?.selfAssertionRequests ?? [])].map((item) => [item.requestItemId, item]));
  const presented = [...(presentation?.credentialPresentations ?? []), ...(presentation?.selfAssertions ?? [])];
  const requestedItems = presented.every((item) => requested.has(item.requestItemId)) ? "valid" : "invalid";
  const supplied = new Set(presented.map((item) => item.requestItemId));
  const requiredItems = [...requested.values()].every((item) => !item.required || supplied.has(item.requestItemId)) ? "valid" : "invalid";
  const checks = { syntax: state(input.syntax), signature: state(input.signature), freshness: state(input.freshness), replay: state(input.replay), presentationBinding: binding, requestedItems, requiredItems };
  return { result: summarize(checks), ...checks };
}

export function verifyHolderPhase(input) {
  const presentation = input.presentation;
  const derivation = presentation?.holder?.authority && input.derivedAuthority ? (presentation.holder.authority === input.derivedAuthority ? "valid" : "invalid") : state(input.authorityDerivation);
  const checks = { schema: state(input.schema), freshness: state(input.freshness), authorityDerivation: derivation, methodAuthorization: state(input.methodAuthorization), keyState: state(input.keyState), signature: state(input.signature) };
  return { result: summarize(checks), authority: presentation?.holder?.authority, ...checks };
}

export function verifyCredentialPhase(input) {
  const results = [];
  for (const item of input.items ?? []) {
    const content = item.content;
    const subjectBinding = content && input.holderAuthority ? (content.subjectHolderAuthority === input.holderAuthority ? "valid" : "invalid") : state(item.subjectBinding);
    const requestMatch = item.requestMatch ?? {};
    const requestSatisfaction = requestMatch.schema === undefined ? state(item.requestSatisfaction) : requestMatch.schema === content?.schema && requestMatch.schemaHash === content?.schemaHash && requestMatch.credentialType === content?.credentialType && item.requiredPathsSatisfied !== false ? "valid" : "invalid";
    const checks = {
      artifactIntegrity: state(item.artifactIntegrity),
      issuerSignature: state(item.issuerSignature),
      issuerAuthority: state(item.issuerAuthority),
      schema: state(item.schema),
      subjectBinding,
      requestSatisfaction,
      disclosure: state(item.disclosure),
      provenanceCheck: state(item.provenanceCheck),
      chain: state(item.chain)
    };
    results.push({ presentationItemId: item.presentationItemId, result: summarize(checks), ...checks, status: item.status ?? "unknown", provenance: item.provenance ?? "unknown", manifestHash: item.manifestHash, contentHash: item.contentHash, errors: structuredClone(item.errors ?? []) });
  }
  return results;
}
