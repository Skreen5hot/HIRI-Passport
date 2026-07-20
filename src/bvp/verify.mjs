import { evaluateIssuerIdentity } from "../core/identity-policy.mjs";
import { validateCoreBvsEvidence } from "../core/bvs-evidence.mjs";
import { loadAdapterProfile,loadEvidenceProfile } from "./resources.mjs";
import { evaluateBvsTrust } from "./trust.mjs";

function exactEvidence(content,evidence,authorizedIntent){
  if(!authorizedIntent)return"unknown";const pairs=[[content.schema,authorizedIntent.schema],[content.schemaHash,authorizedIntent.schemaHash],[content.credentialType,authorizedIntent.credentialType],[evidence.sourceProvider,authorizedIntent.sourceProvider],[evidence.sourceVerificationMethod,authorizedIntent.sourceVerificationMethod],[evidence.adapterId,authorizedIntent.adapterId],[evidence.adapterVersion,authorizedIntent.adapterVersion],[evidence.jurisdiction??"",authorizedIntent.jurisdiction??""]];return pairs.every(([left,right])=>left===right)?"valid":"invalid";
}

export async function verifyBvsCredential({credential,request,presentation,evidenceInputs={},policy,parameters,now},ports={}) {
  const core=ports.coreVerifier?.verifyCredential?await ports.coreVerifier.verifyCredential({credential,request,presentation,evidenceInputs,parameters,now}):structuredClone(evidenceInputs.coreResult??{result:"unknown",issuerSignature:"unknown",status:"unknown"});
  const content=credential.content??credential;const evidence=content.evidence;const bvsAuthority=credential.issuerAuthority??core.issuerAuthority;
  const provenance=credential.provenance==="bvs"&&bvsAuthority?"valid":"invalid";
  const coreEvidence=validateCoreBvsEvidence(content,{get:(id,hash)=>evidenceInputs.profileRegistry?.get?.(id,hash)});
  let evidenceProfile=coreEvidence.result;let adapterProfile=coreEvidence.result;
  if(evidenceInputs.resources&&evidence){const ep=await loadEvidenceProfile(evidenceInputs.resources,evidence.evidenceProfile,evidence.evidenceProfileHash);const ap=await loadAdapterProfile(evidenceInputs.resources,evidence.adapterProfile,evidence.adapterProfileHash);evidenceProfile=ep.result;adapterProfile=ap.result;}
  const consistency=exactEvidence(content,evidence,evidenceInputs.authorizedIntent);const checks=Array.isArray(evidence?.checks)&&evidence.checks.length<=64&&new Set(evidence.checks.map(x=>x.id)).size===evidence.checks.length&&evidence.checks.every(x=>["valid","invalid","unknown","not-applicable"].includes(x.result))?"valid":"invalid";
  let bvsIdentity={result:"unknown",anchors:[]};
  if(bvsAuthority){try{bvsIdentity=evaluateIssuerIdentity(bvsAuthority,evidenceInputs.identityAnchors??[],now);}catch{bvsIdentity={result:"invalid",anchors:[],error:"BVP_EVIDENCE_INCONSISTENT"};}}
  let trust={result:"not-evaluated",issuerTrust:"unknown"};if(evidence&&bvsAuthority)trust=evaluateBvsTrust({bvsAuthority,evidence,credential:content},bvsIdentity,policy);
  const bvpEvidence=[evidenceProfile,adapterProfile,consistency,checks].includes("invalid")?"invalid":[evidenceProfile,adapterProfile,consistency,checks].includes("unknown")?"unknown":"valid";
  return{result:core.result,coreIssuerSignature:core.issuerSignature??"unknown",status:core.status??"unknown",provenance,bvsAuthority,bvsIdentity,evidenceProfile,adapterProfile,evidenceConsistency:consistency,evidenceChecks:checks,bvpEvidence,issuerTrust:trust.issuerTrust,policy:trust,sourceProviderEndorsement:"not-inferred",errors:[]};
}
