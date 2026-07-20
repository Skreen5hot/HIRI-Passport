import { createPresentationBytes, type PresentationAuthorization } from "./presentation-service";

type Prepared = Awaited<ReturnType<typeof createPresentationBytes>>;
const prepared = new Map<string, Prepared>();
const signed = new Map<string, Prepared>();

function tupleFor(authorization: PresentationAuthorization) { return `${authorization.requestId}\u0000${authorization.nonce}\u0000${authorization.verifierAuthority}`; }

export async function prepareSyntheticPresentationOnce(authorization: PresentationAuthorization, holderAuthority: string) {
  const tuple = tupleFor(authorization); const prior = prepared.get(tuple);
  if (prior) return { ...prior, retransmission: true, signed: false as const };
  const result = await createPresentationBytes(authorization, holderAuthority); prepared.set(tuple, result);
  return { ...result, retransmission: false, signed: false as const };
}

export async function signOnce(authorization: PresentationAuthorization, holderAuthority: string, authenticate: () => Promise<boolean>, signer: (presentation: Record<string, unknown>, unsignedBytes: Uint8Array) => Promise<Uint8Array>) {
  const tuple = tupleFor(authorization); const prior = signed.get(tuple);
  if (prior) return { ...prior, retransmission: true, signed: true as const };
  if (!await authenticate()) throw new DOMException("Local authorization was cancelled.", "AbortError");
  if (typeof signer !== "function") throw new TypeError("A capability-verified presentation signer is required.");
  const unsigned = await createPresentationBytes(authorization, holderAuthority); const bytes = await signer(unsigned.presentation, unsigned.bytes);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) throw new TypeError("Presentation signer returned invalid bytes.");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)));
  const result = { ...unsigned, bytes: new Uint8Array(bytes), hash: `sha256:${Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")}` };
  signed.set(tuple, result); return { ...result, retransmission: false, signed: true as const };
}
