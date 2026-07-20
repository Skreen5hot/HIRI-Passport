export function buildConsentViewModel(request: Record<string, unknown>) {
  const verifier = request.verifier as { authority?: string; display?: { name?: string; domain?: string } } | undefined;
  const items = [...((request.credentialRequests as Array<Record<string, unknown>> | undefined) ?? []), ...((request.selfAssertionRequests as Array<Record<string, unknown>> | undefined) ?? [])];
  return { verifier: { authority: verifier?.authority ?? "unknown", name: verifier?.display?.name ?? "Unnamed verifier", domain: verifier?.display?.domain ?? "No display domain", identity: "unknown" as const }, items, required: items.filter(item => item.required === true) };
}
