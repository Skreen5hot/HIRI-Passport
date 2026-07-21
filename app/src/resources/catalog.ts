import type { PackagedResourceBytes } from "./resource-manifest";

/**
 * OWNER-RHP-03 is open: no independently reviewed resource package and no
 * signed exact manifest hash exist. These constants are the only production
 * activation point; test packages cannot populate them at runtime.
 */
export const APPROVED_RESOURCE_MANIFEST_SHA256: string | undefined = undefined;
export const APPROVED_RESOURCE_MANIFEST_BYTES: Uint8Array | undefined = undefined;
export const APPROVED_RESOURCE_BYTES: readonly PackagedResourceBytes[] = Object.freeze([]);
export const APPROVED_SCHEMA_VALIDATORS = Object.freeze([]);
export const PRODUCTION_RESOURCE_CATALOG = Object.freeze([]);

/** Compatibility name for the deliberately empty Synthetic Demo catalog. */
export const SYNTHETIC_RESOURCE_CATALOG = Object.freeze([]);

export const RESOURCE_STATUS = Object.freeze({
  productionReady: false,
  blocker: "OPEN-CONTEXT-01"
});

export const RESOURCE_APPROVAL_STATUS = Object.freeze({
  disposition: "unavailable" as const,
  ownerGate: "OWNER-RHP-03" as const,
  technicalBlocker: "OPEN-CONTEXT-01" as const,
  independentReviewerDesignated: false,
  signedManifestApproved: false,
  candidateReady: false,
  classification: "project preview resource" as const
});
