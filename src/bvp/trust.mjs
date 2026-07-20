export function createBvsTrustKey({ bvsAuthority, evidence, credential }) {
  const fields=[bvsAuthority,evidence?.sourceProvider,evidence?.sourceVerificationMethod,credential?.schema,evidence?.jurisdiction??"",evidence?.adapterVersion]; if(fields.some((value)=>typeof value!=="string"||!value.length&&value!==""))throw new TypeError("complete BVS trust tuple required"); return Object.freeze(fields);
}

export function evaluateBvsTrust(input, identity, policy) {
  const key=createBvsTrustKey(input); if(!policy)return{result:"not-evaluated",issuerTrust:"unknown",key};
  if(typeof policy.id!=="string"||typeof policy.version!=="string"||typeof policy.evaluate!=="function")throw new TypeError("versioned BVS trust policy required");
  const decision=policy.evaluate(key,{...input,identity}); if(!decision||!["accepted","rejected","not-evaluated"].includes(decision.result))throw new TypeError("invalid BVS policy decision");
  const reasons=decision.reasons??[];for(const reason of reasons)if(!Array.isArray(reason.evidencePaths)&&typeof reason.predicate!=="string")throw new TypeError("BVS trust reasons require evidence links");
  return{result:decision.result,issuerTrust:decision.result==="accepted"?"trusted":decision.result==="rejected"?"untrusted":"unknown",policyId:policy.id,policyVersion:policy.version,key,reasons:structuredClone(reasons)};
}

export function validateAssuranceStatement(statement) { if(!statement||/tier\s*[123]|level\s*\d/iu.test(JSON.stringify(statement)))return{result:"invalid"};for(const name of["scheme","scope","auditor","reportDate","expiry"])if(typeof statement[name]!=="string"||!statement[name].length)return{result:"invalid"};return{result:"valid",statement:structuredClone(statement)}; }
