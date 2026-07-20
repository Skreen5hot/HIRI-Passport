import test from "node:test";
import assert from "node:assert/strict";
import { updateBvsCredentialStatus } from "../../src/bvp/status.mjs";
import { deriveAuthority } from "../../src/core/authority.mjs";
const holder=deriveAuthority(new Uint8Array(32));const content={"@type":"hiri:passport:CredentialClaim",schema:"https://e.test/s",schemaHash:`sha256:${"0".repeat(64)}`,credentialType:"T",subjectHolderAuthority:holder,claims:{},issuanceDate:"2026-07-20T00:00:00Z",status:{state:"active",effectiveAt:"2026-07-20T00:00:00Z"}};
test("BVS status changes append signed Core versions",async()=>{const result=await updateBvsCredentialStatus({uri:"u",manifestHash:"h",content},"revoked","2026-07-21T00:00:00Z",{hiriIssuer:{appendResolutionManifest:async x=>x}});assert.equal(result.result,"updated");assert.equal(result.artifact.content.status.state,"revoked");const terminal=structuredClone(content);terminal.status={state:"revoked",effectiveAt:"2026-07-21T00:00:00Z"};assert.equal((await updateBvsCredentialStatus({uri:"u",manifestHash:"h",content:terminal},"active","2026-07-22T00:00:00Z",{})).error,"STATUS_TRANSITION_INVALID");});
