import * as authority from "../core/authority.mjs";
import * as credential from "../core/credential.mjs";
import * as disclosureRequest from "../core/disclosure-request.mjs";
import * as message from "../core/message.mjs";
import * as portfolioCrypto from "../core/portfolio-crypto.mjs";
import * as portfolioRecords from "../core/portfolio-records.mjs";
import * as presentation from "../core/presentation.mjs";
import * as presentationPackage from "../core/presentation-package.mjs";
import * as requestSession from "../core/request-session.mjs";
import * as selfAssertion from "../core/self-assertion.mjs";
import { evaluateIssuerIdentity, evaluatePolicy } from "../core/identity-policy.mjs";
import { buildVerificationReport } from "../core/report.mjs";
import { verifyCredentialPhase, verifyHolderPhase, verifyRequestPhase } from "../core/verify-rhc.mjs";
import { verifyBvsCredential } from "../bvp/verify.mjs";
import * as bvpChallenge from "../bvp/challenge.mjs";
import * as bvpResponse from "../bvp/response.mjs";
import { verifyPassport as orchestrateVerification } from "./verify-passport.mjs";

export const core = Object.freeze({ authority, credential, disclosureRequest, message, portfolioCrypto, portfolioRecords, presentation, presentationPackage, requestSession, selfAssertion });
export const bvp = Object.freeze({ challenge: bvpChallenge, response: bvpResponse, verifyBvsCredential });

export function parseJson(text) {
  if (typeof text !== "string") throw new TypeError("JSON input must be text");
  const value = JSON.parse(text); if (!value || typeof value !== "object") throw new TypeError("protocol JSON root must be an object"); return value;
}

export function createPassportSdk(ports = {}) {
  const resolver = Object.freeze({ async resolve(ref) { if (typeof ports.artifactResolver?.resolve !== "function") return null; const result = await ports.artifactResolver.resolve(ref); return result ? { ...result, provenance: { source: result.provenance?.source ?? "resolver", retrievedAt: result.provenance?.retrievedAt ?? null, transportAuthenticated: result.provenance?.transportAuthenticated === true } } : null; } });
  return Object.freeze({
    parse: Object.freeze({ json: parseJson }),
    validate: Object.freeze({ disclosureRequest: disclosureRequest.validateDisclosureRequest, presentation: presentation.validatePresentation, presentationPackage: presentationPackage.validatePresentationPackage }),
    cryptography: Object.freeze({ verifyMessage: (domain, value, evidence) => message.verifyPassportMessage(domain, value, evidence, ports), verifyBvsCredential: (input) => verifyBvsCredential(input, ports) }),
    identity: Object.freeze({ evaluateIssuer: evaluateIssuerIdentity }),
    policy: Object.freeze({ evaluate: evaluatePolicy }),
    resolver,
    verifyPassport: (input) => orchestrateVerification(input, ports)
  });
}
