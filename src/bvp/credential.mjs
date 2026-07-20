import { jcsBytes } from "../core/canonical.mjs";
import { preparePublicCredentialIssuance, validateCredentialClaim } from "../core/credential.mjs";
import { sha256Identifier } from "../core/proof.mjs";
import { parseUtcSeconds } from "../core/scalars.mjs";

const SECRET = /(?:token|password|cookie|ipAddress|deviceFingerprint|biometric|documentImage|riskScore|rawResponse)/iu;
function containsSecret(value) { if (!value || typeof value !== "object") return false; return Object.entries(value).some(([key, child]) => SECRET.test(key) || containsSecret(child)); }

export async function prepareBvsCredential(session, claims, finalPreviewAuthorization, issuancePolicy, now, ports = {}) {
  if (!session?.finalized || !session.holderBinding) return { result: "prohibited", error: "BVP_SOURCE_EVIDENCE_UNKNOWN" };
  if (parseUtcSeconds(session.holderBinding.expiresAt) < parseUtcSeconds(now)) return { result: "prohibited", error: "BVP_MESSAGE_EXPIRED" };
  if (!issuancePolicy?.id || !issuancePolicy?.version || issuancePolicy.eligible !== true) return { result: "prohibited", error: "BVP_PUBLICATION_NOT_AUTHORIZED" };
  if (finalPreviewAuthorization?.authorized !== true || finalPreviewAuthorization.completePublicPublication !== true) return { result: "prohibited", error: "BVP_PUBLICATION_NOT_AUTHORIZED" };
  const intentId = finalPreviewAuthorization.intentId; if (!session.holderBinding.authorizedIntentIds.includes(intentId)) return { result: "prohibited", error: "BVP_INTENT_UNAUTHORIZED" };
  const intent = session.intents[intentId]; const transcript = session.transcripts[intentId]; if (!transcript || transcript.result !== "valid") return { result: "prohibited", error: "BVP_SOURCE_EVIDENCE_INVALID" };
  if (containsSecret(claims) || containsSecret(transcript)) return { result: "prohibited", error: "BVP_SOURCE_EVIDENCE_INVALID" };
  const challengeHash = await sha256Identifier(jcsBytes(session.challenge), ports.sha256); const responseHash = await sha256Identifier(jcsBytes(session.holderBinding.response), ports.sha256);
  const checks = transcript.checks; if (checks.length > 64 || new Set(checks.map((check) => check.id)).size !== checks.length || checks.some((check) => !["valid", "invalid", "unknown", "not-applicable"].includes(check.result) || Object.keys(check).some((key) => !["id", "result"].includes(key)))) return { result: "prohibited", error: "BVP_EVIDENCE_INCONSISTENT" };
  const required = new Set(issuancePolicy.requiredChecks ?? []); if (checks.some((check) => required.has(check.id) && check.result !== "valid") || [...required].some((id) => !checks.some((check) => check.id === id))) return { result: "prohibited", error: "BVP_SOURCE_EVIDENCE_INVALID" };
  const evidence = { type:"hiri:passport:BvsEvidence",evidenceProfile:intent.evidenceProfile,evidenceProfileHash:intent.evidenceProfileHash,sourceProvider:intent.sourceProvider,sourceVerificationMethod:intent.sourceVerificationMethod,sourceSubjectType:transcript.sourceSubjectType,sourceObservedAt:transcript.sourceObservedAt,verifiedAt:transcript.checksCompletedAt,adapterId:intent.adapterId,adapterVersion:intent.adapterVersion,adapterProfile:intent.adapterProfile,adapterProfileHash:intent.adapterProfileHash,adapterImplementationVersion:transcript.adapterImplementationVersion,...(intent.jurisdiction?{jurisdiction:intent.jurisdiction}:{}),holderBinding:{challengeId:session.challenge.challengeId,challengeHash,responseHash,intentId,result:"valid"},checks:structuredClone(checks) };
  const content = { "@type":"hiri:passport:CredentialClaim",schema:intent.schema,schemaHash:intent.schemaHash,credentialType:intent.credentialType,subjectHolderAuthority:session.holderAuthority,claims:structuredClone(claims),evidence,issuanceDate:now,status:{state:"active",effectiveAt:now} };
  const expectedPreviewHash = await sha256Identifier(jcsBytes(content), ports.sha256); if (finalPreviewAuthorization.contentHash !== expectedPreviewHash) return { result: "prohibited", error: "BVP_PUBLICATION_NOT_AUTHORIZED" };
  const validation=validateCredentialClaim(content,{genesis:true}); if(validation.result!=="valid")return validation;
  return { result:"prepared",issuerAuthority:session.challenge.bvs.authority,content,authorization:structuredClone(finalPreviewAuthorization),audit:{issuancePolicyId:issuancePolicy.id,issuancePolicyVersion:issuancePolicy.version,sessionId:session.sessionId} };
}

export async function issueBvsCredential(prepared, ports) {
  if (prepared?.result !== "prepared") return { result:"prohibited",error:prepared?.error??"BVP_PUBLICATION_NOT_AUTHORIZED" };
  const publication = await preparePublicCredentialIssuance({ issuerAuthority:prepared.issuerAuthority,content:prepared.content,publicPublicationAuthorized:true },ports);
  if(publication.result!=="prepared")return publication;
  if(typeof ports.hiriIssuer?.issueResolutionManifest!=="function")return {result:"unknown",error:"BVP_SOURCE_EVIDENCE_UNKNOWN",prepared:publication};
  const artifact=await ports.hiriIssuer.issueResolutionManifest({uri:publication.uri,publisher:prepared.issuerAuthority,content:prepared.content,envelopeType:"hiri:ResolutionManifest"});
  return {result:"issued",artifact,audit:prepared.audit};
}
