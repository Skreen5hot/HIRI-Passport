import { evaluateIssuerIdentity } from "../core/identity-policy.mjs";
import { verifyPassportManifest } from "../core/manifest.mjs";
import { validateWithPinnedSchema } from "../core/resources.mjs";
import { assertClosedObject, methodAuthority, parseAbsoluteUri, parseEd25519Authority, parseSha256Identifier, parseUtcSeconds } from "../core/scalars.mjs";

const MEMBERS = ["@context", "@type", "schema", "schemaHash", "bvsAuthority", "operator", "supportedEvidenceProfiles", "policyDisclosure", "effectiveAt"];

export async function validateBvsGovernance({ manifest, content, schemaRegistry }, ports) {
  const verified = await verifyPassportManifest({ manifest, content, evaluationTime: content?.effectiveAt }, ports); if (verified.result !== "valid") return verified;
  try {
    assertClosedObject(content, MEMBERS, MEMBERS, "BVS governance"); if (content["@type"] !== "hiri:passport:BvsGovernance") throw new TypeError(); parseAbsoluteUri(content["@context"]); parseAbsoluteUri(content.schema); parseSha256Identifier(content.schemaHash); parseEd25519Authority(content.bvsAuthority); parseAbsoluteUri(content.policyDisclosure); parseUtcSeconds(content.effectiveAt);
    const expectedUri = `hiri://${content.bvsAuthority}/data/bvs-governance`; if (manifest["@id"] !== expectedUri || verified.authority !== content.bvsAuthority || manifest["hiri:publisher"] !== content.bvsAuthority || methodAuthority(manifest["hiri:signature"].verificationMethod) !== content.bvsAuthority) throw new TypeError();
    assertClosedObject(content.operator, ["name", "jurisdiction"], ["name"], "operator"); if (!Array.isArray(content.supportedEvidenceProfiles) || !content.supportedEvidenceProfiles.length) throw new TypeError(); for (const profile of content.supportedEvidenceProfiles) { assertClosedObject(profile,["id","hash"],["id","hash"],"supported profile");parseAbsoluteUri(profile.id);parseSha256Identifier(profile.hash); }
  } catch { return { result:"invalid",error:"BVP_EVIDENCE_INCONSISTENT" }; }
  const schema = await validateWithPinnedSchema(content,content.schema,content.schemaHash,{},schemaRegistry); if(schema.result!=="valid")return schema.result==="unknown"?{result:"unknown",error:"BVP_PROFILE_UNAVAILABLE"}:{result:"invalid",error:"BVP_PROFILE_HASH_MISMATCH"};
  return {result:"valid",bvsAuthority:content.bvsAuthority,operatorClaim:structuredClone(content.operator),supportedEvidenceProfiles:structuredClone(content.supportedEvidenceProfiles),policyDisclosure:content.policyDisclosure,effectiveAt:content.effectiveAt,manifestHash:verified.manifestHash};
}

export function resolveBvsIdentity(governance, anchors, at) { const identity=evaluateIssuerIdentity(governance.bvsAuthority,anchors,at); return {...identity,operatorClaim:governance.operatorClaim,claimIsIdentityEvidence:false}; }
