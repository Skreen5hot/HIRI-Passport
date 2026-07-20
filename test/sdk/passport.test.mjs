import test from "node:test";
import assert from "node:assert/strict";
import { createPassportSdk, parseJson } from "../../src/sdk/passport.mjs";

test("SDK facade keeps parsing, evidence, identity, and policy layers separate", async () => {
  const sdk=createPassportSdk();assert.deepEqual(parseJson('{"a":1}'),{a:1});assert.equal(typeof sdk.validate.presentation,"function");assert.equal(typeof sdk.cryptography.verifyMessage,"function");assert.equal(typeof sdk.identity.evaluateIssuer,"function");assert.equal(typeof sdk.policy.evaluate,"function");
  const report=await sdk.verifyPassport({now:"2026-07-20T00:00:00Z",parameters:{messageClockSkewSeconds:0,credentialIssuanceToleranceSeconds:0},requestPhase:{syntax:"valid",signature:"valid",freshness:"valid",replay:"valid",request:{credentialRequests:[],selfAssertionRequests:[]},presentation:{requestBinding:{},credentialPresentations:[],selfAssertions:[]}},holderPhase:{schema:"unknown",freshness:"unknown",methodAuthorization:"unknown",keyState:"unknown",signature:"unknown"},policy:{id:"p",version:"1",evaluate:()=>({result:"accepted",reasons:[{predicate:"low risk"}]})}});assert.equal(report.policy.result,"accepted");assert.equal(report.cryptographicDisposition,"unknown");
});
test("resolver convenience preserves provenance outside the kernel",async()=>{const sdk=createPassportSdk({artifactResolver:{resolve:async()=>({artifact:{},provenance:{source:"cache",retrievedAt:"2026-07-20T00:00:00Z",transportAuthenticated:true}})}});const result=await sdk.resolver.resolve({hash:"h"});assert.equal(result.provenance.source,"cache");assert.equal(result.provenance.transportAuthenticated,true);});
