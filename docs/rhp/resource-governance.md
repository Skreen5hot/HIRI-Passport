# Real Holder Preview resource governance

Status: APPROVED TARGET GOVERNANCE — no production resource set is approved

Owner gate: `OWNER-RHP-03`

Authority: RHP-DR-002 D1-A, signed tag `RHP-DR-002-approved-2026-07-20`

Technical gate: `OPEN-CONTEXT-01`

Preview namespace: `https://hiri-protocol.org/resources/preview/rhp-2026-07/`

## 1. Purpose

The Real Holder Preview requires exact, immutable bytes for every schema, context, evidence profile, adapter profile, policy input, and configuration artifact that affects parsing, signing, verification, or user claims. This document defines how those bytes are prepared, approved, published, pinned, corrected, disabled, and audited.

It does not turn a Working Draft resource into a Candidate or ecosystem-normative resource. A resource may be approved only as a project-specific Real Holder Preview resource until the applicable specification governance publishes a normative successor.

## 2. Governing hierarchy

1. Pinned upstream HIRI specifications and their immutable resources govern HIRI artifact semantics.
2. The Core v2.0.0 Working Draft governs Passport messages and content.
3. BVP v3.0.0 governs BVS behavior only where BVS scope is enabled; BVS is excluded from this preview.
4. UX v2.0.0 governs application behavior without changing protocol bytes.
5. RHP-DR-001, RHP-DR-002, and `docs/rhp/release-contract.md` narrow the preview scope.
6. A signed preview resource approval selects exact project resource bytes; it cannot relax a higher-level requirement.

## 3. Current state

RHP-DR-002 D1-A approves the project-preview resource governance model in this document. It does not approve any resource bytes or close `OWNER-RHP-03`: no independent reviewer is designated and no exact manifest hash has received signed owner approval. `app/src/resources/catalog.ts` therefore correctly contains an empty production catalog and reports:

```text
productionReady: false
blocker: OPEN-CONTEXT-01
```

Synthetic fixtures under `app/src/resources/synthetic/` and test resources using `.test` or `.invalid` domains are not approval candidates, normative resources, or production vectors. They must be excluded from a Real Holder Preview artifact.

While the registry is empty:

- real request, credential, presentation, and persistent self-assertion success paths remain unavailable when they require a schema or context;
- missing resources return `unknown` or a stable unavailable error rather than success;
- the product must not invent hashes, fetch placeholder URLs, or trust first-use bytes;
- `candidateReady` remains `false`.

## 4. Resource classes

| Kind | Examples | Required for this preview? | Approval rule |
|---|---|---:|---|
| Upstream HIRI resource | HIRI context/schema/profile pinned by upstream suite contract | As applicable | Exact upstream revision, URI, bytes, and hash |
| Passport message schema | Disclosure Request, Presentation, Presentation Package | Yes for enabled message paths | Project-preview approval until Candidate publication |
| Passport content schema | Persistent/ephemeral self-assertion and portfolio content | Yes for enabled paths | Project-preview approval; complete public semantics reviewed |
| Passport context | Passport JSON-LD vocabulary | Packaged for reference; not used to claim URDNA2015 interoperability | Exact bytes/hash; JCS remains normative for preview paths |
| Runtime configuration schema | Origin, resource, trust, policy, capability configuration | Yes | Repository-reviewed, closed schema, exact release binding |
| Relying-party policy | Identity/status/acceptance predicates | No initial acceptance policy | Separate version and owner approval; cannot rewrite evidence |
| Identity anchor | Authority-to-organization evidence | No initial anchors | Separate trust-config approval and expiry |
| BVP evidence/adapter profile | Provider procedure and evidence binding | No; BVS excluded | Must not ship in production registry for this release |
| Test vector | Positive, negative, adversarial bytes | Yes for project testing | Labeled project vector; never called normative unless published as such |

## 5. Resource manifest contract

One versioned, canonical JSON manifest must identify the complete production set. Each entry requires:

```json
{
  "id": "https://hiri-protocol.org/resources/preview/rhp-2026-07/<kind>/<name>/<version>",
  "kind": "schema|context|profile|policy|configuration",
  "version": "<immutable version>",
  "sha256": "sha256:<64 lowercase hex characters>",
  "canonicalization": "JCS|raw-bytes",
  "mediaType": "application/schema+json|application/json|text/plain",
  "bytesPath": "resources/<reviewed immutable file>",
  "specification": "<document and section>",
  "approvalRecord": "<signed decision reference>"
}
```

The manifest itself requires a canonical-byte SHA-256, release identifier, generation script version, source commit, approval record, and creation time supplied explicitly. Array order and duplicate handling must be deterministic. Unknown fields, kinds, canonicalizations, insecure URIs, fragments where forbidden, placeholder domains, duplicate `(id, sha256)` entries, and missing bytes are errors.

## 6. Preparation and approval process

### 6.1 Prepare

1. derive a resource from the controlling Working Draft and pinned upstream contract;
2. assign a permanent versioned URI below `https://hiri-protocol.org/resources/preview/rhp-2026-07/` so project-preview status is visible in the identifier;
3. use JSON Schema Draft 2020-12 where the resource is a schema;
4. ensure schema `$id` exactly equals the carried absolute schema URI and has no fragment;
5. close object shapes and remote `$ref` behavior as required by the specification;
6. canonicalize by the declared method and compute SHA-256 from exact bytes;
7. produce positive, negative, boundary, duplicate-member, depth, size, and substitution tests;
8. record provenance from specification text to resource fields and tests.

### 6.2 Review

At least one named reviewer other than the byte author checks:

- semantic correspondence with the specifications;
- exact URI/hash/byte agreement;
- schema dialect and closed-shape behavior;
- resource limits and remote reference prohibition;
- public-disclosure and privacy consequences;
- compatibility with the pinned HIRI revision;
- absence of placeholders, secrets, private endpoints, and synthetic success material.

### 6.3 Approve

The project owner signs a resource-set decision containing the manifest hash, source commit, resource count, intended release, limitations, reviewer evidence, and expiry/review date. Approval is for those bytes only. A merge, deployed URL, or passing test is not approval.

The reviewer is a release gate, not an accepted control gap. Review may be performed by an external technical reviewer on the manifest package; the reviewer does not need repository administration. The review record must name the author and reviewer, state their independence for this package, identify the reviewed commit and manifest hash, and record findings and disposition.

### 6.4 Publish and integrate

Approved bytes are committed at immutable paths and may be served at their versioned URIs. The application packages or hash-verifies them before parsing. Runtime code selects a resource by `(id, sha256, kind)`; URI alone never selects trusted bytes.

## 7. Retrieval and processing rules

- Unknown remote contexts are never fetched during verification.
- First-use TLS retrieval never establishes trust.
- Packaged or previously approved bytes are preferred.
- A network response must match the configured SHA-256 before parsing or caching.
- Redirects, content-type mismatch, oversize response, invalid encoding, duplicate JSON members, unpinned remote references, and unexplained mutation fail closed.
- Cached bytes retain source, capture time, expected hash, actual hash, and approval manifest.
- The service worker may cache only immutable approved public resources; mutable trust/status/notice traffic remains outside its cache.

## 8. Versioning and corrections

An approved URI is immutable. Different bytes require a new versioned URI and hash. The project must not silently replace bytes at the same URI, even to fix a typo.

A correction record states:

- affected URI/hash and replacement URI/hash;
- whether prior artifacts remain verifiable;
- migration or display consequence;
- reason, reviewer, approval, effective time, and rollback plan;
- test/vector changes.

Historical signed artifacts continue to resolve against their original approved pins unless a compromise rule explicitly rejects the resource for policy use. Historical cryptographic evidence is not rewritten.

## 9. Compromise, deprecation, and rollback

A resource may be disabled for new operations by a versioned signed control record. The record identifies the exact resource, affected release/configuration, reason, effective time, replacement, and handling of historical evidence.

Clients must reject:

- a lower manifest version replacing a higher authenticated version;
- the same version with different bytes/hash;
- a resource not present in the approved release manifest;
- a manifest whose approval has expired or been terminated.

Rollback restores a previously approved complete release manifest, never an ad hoc subset.

## 10. Preview-versus-normative language

Repository and UI language must use:

- **project preview resource** for bytes approved only for this implementation;
- **project test vector** for implementation tests;
- **Working Draft requirement** for specification text not yet Candidate;
- **normative resource/vector** only after the responsible specification authority publishes it as such.

Publishing exact bytes and hashes improves reproducibility but does not by itself establish standards authority or conformance.

## 11. Remaining approval package required to close OWNER-RHP-03

The first resource decision must include at minimum:

1. the self-assertion schemas used by enabled persistent and ephemeral paths;
2. schemas for every enabled request, presentation, and package message;
3. the preview context bytes and explicit statement that JCS—not URDNA2015—is used for preview signing;
4. runtime and trust configuration schemas;
5. all immutable byte files and the generated resource manifest;
6. exact SHA-256 values and a reproducibility command;
7. project positive/adversarial vectors and requirement mappings;
8. independent semantic review evidence;
9. a signed owner approval binding the manifest hash.

The approval package must identify the independent reviewer. If no qualified independent reviewer is available, `OWNER-RHP-03` remains open and resource-dependent real workflows remain disabled.

Until that package exists, resource-dependent real-data workflows remain disabled.
