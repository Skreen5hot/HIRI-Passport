import test from "node:test";
import assert from "node:assert/strict";
import { jcsBytes } from "../../src/core/canonical.mjs";
import { createBvpResourceRegistry,loadAdapterProfile,loadEvidenceProfile } from "../../src/bvp/resources.mjs";
const digest=async(bytes)=>{const out=new Uint8Array(32);for(let i=0;i<bytes.length;i++)out[i%32]^=bytes[i];return out};const hash=async v=>`sha256:${[...(await digest(jcsBytes(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}`;
test("BVP normative resources require exact URI and hash pins",async()=>{const value={profile:"v1"},h=await hash(value),registry=createBvpResourceRegistry([{id:"https://e.test/profile",hash:h,kind:"evidence-profile",value}],{sha256:{digest}});assert.equal((await loadEvidenceProfile(registry,"https://e.test/profile",h)).result,"valid");assert.equal((await loadAdapterProfile(registry,"https://e.test/profile",h)).result,"invalid");assert.equal((await loadEvidenceProfile(registry,"https://e.test/missing",h)).result,"unknown");});
