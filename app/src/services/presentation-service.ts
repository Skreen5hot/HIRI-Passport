const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
const freshId = () => { const value = new Uint8Array(16); crypto.getRandomValues(value); return base64url(value); };

export type PresentationAuthorization = Readonly<{ requestId: string; nonce: string; verifierAuthority: string; selectedItemIds: string[]; expiresAt: string }>;

export async function createPresentationBytes(authorization: PresentationAuthorization, holderAuthority: string) {
  if (Date.parse(authorization.expiresAt) <= Date.now()) throw new Error("Authorization expired before signing.");
  const presentation = {
    protocol: "hiri-passport/2.0",
    type: "PassportPresentation",
    presentationId: freshId(),
    holder: { authority: holderAuthority },
    requestBinding: { requestId: authorization.requestId, nonce: authorization.nonce, verifierAuthority: authorization.verifierAuthority },
    credentialPresentations: authorization.selectedItemIds.map(requestItemId => ({ presentationItemId: freshId(), requestItemId })),
    selfAssertions: [],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Math.min(Date.parse(authorization.expiresAt), Date.now() + 300_000)).toISOString()
  };
  const bytes = encoder.encode(JSON.stringify(presentation));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return { presentation, bytes, hash: `sha256:${Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")}` };
}
