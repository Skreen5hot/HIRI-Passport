import { validateCredentialVersion } from "../core/credential-chain.mjs";
import { evaluateCredentialStatus } from "../core/status.mjs";

export async function updateBvsCredentialStatus(credential, state, effectiveAt, ports) {
  if(!["active","suspended","revoked","superseded"].includes(state))throw new TypeError("unsupported Core status state");
  const next=structuredClone(credential.content);next.status={state,effectiveAt};const validation=validateCredentialVersion(credential.content,next);if(validation.result!=="valid")return validation;
  if(typeof ports.hiriIssuer?.appendResolutionManifest!=="function")return{result:"unknown",error:"CURRENT_HEAD_UNKNOWN"};
  return{result:"updated",artifact:await ports.hiriIssuer.appendResolutionManifest({uri:credential.uri,content:next,previous:credential.manifestHash})};
}
export function evaluateBvsCredentialStatus(input,ports){return evaluateCredentialStatus(input,ports);}
