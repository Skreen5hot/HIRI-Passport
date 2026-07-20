import test from "node:test";
import assert from "node:assert/strict";
import { createBvsTrustKey,evaluateBvsTrust,validateAssuranceStatement } from "../../src/bvp/trust.mjs";
const input={bvsAuthority:"bvs",evidence:{sourceProvider:"p",sourceVerificationMethod:"m",jurisdiction:"US-NY",adapterVersion:"1"},credential:{schema:"s"}};
test("BVS trust never propagates outside the six-tuple",()=>{assert.deepEqual(createBvsTrustKey(input),["bvs","p","m","s","US-NY","1"]);const result=evaluateBvsTrust(input,{result:"valid"},{id:"policy",version:"1",evaluate:key=>({result:key[1]==="p"?"accepted":"rejected",reasons:[{evidencePaths:["/evidence/sourceProvider"]}]})});assert.equal(result.issuerTrust,"trusted");assert.equal(validateAssuranceStatement({tier:2}).result,"invalid");});
