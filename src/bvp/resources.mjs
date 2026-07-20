import { createPinnedResourceRegistry, loadPinnedResource } from "../core/resources.mjs";

export function createBvpResourceRegistry(entries,options={}) { const allowed=new Set(["bvp-context","bvp-schema","evidence-profile","adapter-profile"]);for(const entry of entries)if(!allowed.has(entry.kind))throw new TypeError("unsupported BVP resource kind");return createPinnedResourceRegistry(entries,options); }
export const loadBvpContext=(registry,id,hash)=>loadPinnedResource(registry,id,hash,"bvp-context");
export const loadBvpSchema=(registry,id,hash)=>loadPinnedResource(registry,id,hash,"bvp-schema");
export const loadEvidenceProfile=(registry,id,hash)=>loadPinnedResource(registry,id,hash,"evidence-profile");
export const loadAdapterProfile=(registry,id,hash)=>loadPinnedResource(registry,id,hash,"adapter-profile");
