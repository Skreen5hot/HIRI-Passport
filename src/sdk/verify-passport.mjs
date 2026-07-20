import { evaluatePolicy } from "../core/identity-policy.mjs";
import { buildVerificationReport } from "../core/report.mjs";
import { verifyCredentialPhase, verifyHolderPhase, verifyRequestPhase } from "../core/verify-rhc.mjs";
import { verifyBvsCredential } from "../bvp/verify.mjs";

const result = (value = "unknown") => ({ result: value });

export async function verifyPassport(input, ports = {}) {
  if (!input || typeof input !== "object") throw new TypeError("verification input is required");
  const errors = [...(input.errors ?? [])];
  const request = verifyRequestPhase(input.requestPhase ?? { request: input.request, presentation: input.presentation });
  const holder = verifyHolderPhase(input.holderPhase ?? { presentation: input.presentation });
  const credentials = verifyCredentialPhase({ holderAuthority: input.presentation?.holder?.authority, items: input.credentialPhases ?? [] });
  const bvpEvidence = [];

  for (const candidate of input.bvpCredentials ?? []) {
    try {
      bvpEvidence.push(await verifyBvsCredential({ ...candidate, request: input.request, presentation: input.presentation, policy: input.policy, parameters: input.parameters, now: input.now }, ports));
    } catch (error) {
      bvpEvidence.push(result("unknown"));
      errors.push({ code: "BVP_VERIFICATION_UNAVAILABLE", message: error instanceof Error ? error.message : "BVP verification unavailable" });
    }
  }

  const policy = evaluatePolicy({ request, holder, credentials, bvpEvidence }, input.policy);
  return buildVerificationReport({
    verifiedAt: input.now,
    parameters: input.parameters,
    request,
    holder,
    credentials: credentials.map((credential, index) => ({ ...credential, bvp: bvpEvidence[index] })),
    selfAssertions: input.selfAssertions ?? [],
    policy,
    errors
  });
}
