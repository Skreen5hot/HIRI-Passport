import test from "node:test";
import assert from "node:assert/strict";
import { resolveBvsIdentity } from "../../src/bvp/governance.mjs";
import { authority } from "../helpers.mjs";
test("governance self-claims do not become organizational identity",()=>{const bvs=authority(1);const result=resolveBvsIdentity({bvsAuthority:bvs,operatorClaim:{name:"Example"}},[],"2026-07-20T00:00:00Z");assert.equal(result.result,"unknown");assert.equal(result.claimIsIdentityEvidence,false);assert.equal(result.operatorClaim.name,"Example");});
