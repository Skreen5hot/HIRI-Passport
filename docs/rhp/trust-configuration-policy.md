# Real Holder Preview trust-configuration policy

Status: APPROVED FAIL-CLOSED TARGET BASELINE — implementation and activation evidence remain open

Owner gate: `OWNER-RHP-04`

Authority: RHP-DR-002 D2-A, signed tag `RHP-DR-002-approved-2026-07-20`

Release scope: holder-only, self-assertions only, no issuer/BVS services

## 1. Principle

Trust is explicit configuration, not discovery. Cryptographic validity, key state, credential status, organizational identity, provenance, and relying-party policy remain separate results. No adapter or UI may turn `invalid`, `unknown`, `untrusted`, or `not-evaluated` into success because a domain looks familiar, TLS succeeded, content was holder-supplied, or a policy prefers it.

## 2. Initial baseline

The safe initial configuration is:

```json
{
  "canonicalOrigin": "https://hiri-protocol.org",
  "releaseId": "real-holder-preview",
  "issuerAuthorities": [],
  "verifierIdentityAnchors": [],
  "issuerIdentityAnchors": [],
  "issuerAuthoritativeCurrentHeadOrigins": [],
  "artifactResolverOrigins": [],
  "remoteResourceOrigins": [],
  "presentationDeliveryOrigins": [],
  "bvsTrustTuples": [],
  "acceptedCredentialSchemas": [],
  "relyingPartyPolicies": []
}
```

RHP-DR-002 D2-A approves these exact empty sets as the target production trust configuration for the current release. Activation still requires a hash-bound runtime configuration and all implementation, test, threat-review, and release gates. Empty arrays are intentional controls:

- no issuer or BVS credential is trusted or issued;
- no display name/domain is verified organizational identity;
- no remote source establishes current-head freshness;
- no remote artifact or resource is fetched as trusted input;
- no HTTPS presentation destination is enabled;
- no credential acceptance policy is evaluated.

Local file/paste inspection and file/clipboard delivery may be implemented without adding trust entries, but all protocol and resource checks still apply.

## 3. Authority classes

| Class | Meaning | Initial configuration |
|---|---|---|
| Holder authority | Genesis-derived Ed25519 authority controlled by the local holder | Created only after key/browser gates close |
| Verifier authority | Cryptographic authority signing one Disclosure Request | May verify cryptographically from supplied lifecycle evidence; organizational identity remains unknown |
| Issuer authority | Direct signer of a Credential Claim | No trusted/approved issuers in this release |
| BVS authority | Direct issuer of a BVS Credential Claim | Excluded by RHP-DR-001 D6-A |
| Identity anchor | Authenticated evidence connecting an authority to an organization | Empty |
| Issuer-authoritative head source | Configured source permitted to establish current credential head | Empty |
| Resolver | Origin permitted to return bounded artifacts | Empty |

Possession of an authority key proves only the applicable cryptographic control and authorization history. It does not prove a person's name, organization, legal identity, credential truth, or acceptable policy.

## 4. Verifier request handling

A Disclosure Request can progress to consent only if structure, fixed values, signature, verification-method authorization, time bounds, nonce, resource pins, and replay state all validate. The request's display name and domain remain a **signed hint** unless a separately configured identity anchor validates the verifier authority.

Under the empty identity baseline:

- `requestSignature` may be `valid`;
- `verifierIdentity` is `unknown`;
- policy is `not-evaluated`;
- the UI must show those facts separately;
- consent may be offered only if the release policy explicitly permits interaction with identity-unknown verifier authorities and shows that limitation at the decision point.

RHP-DR-002 D2-A permits that interaction only after the complete validation, inert rendering, persistent replay defense, fixed identity-unknown warning, complete-public preview, local file/paste ingress, file/clipboard egress, and mandatory local-authentication controls pass. The approval does not permit a UI to infer identity, status, trust, or policy success.

## 5. Issuer credentials and status

RHP-DR-001 D6-A enables no issuer service and approves self-assertions only. Therefore:

- production acquisition must not present any imported issuer/BVS credential as trusted or preview-issued;
- an imported artifact may be safely inspected and reported with independent evidence dimensions only after its schemas/resources are pinned;
- issuer identity is `unknown` without an anchor;
- current status is `unknown` without a fresh current head from an explicitly configured issuer-authoritative source;
- holder-supplied, cached, reachable, or TLS-authenticated content does not establish current-head authority;
- policy cannot promote unknown identity/status or invalid cryptography.

If issuer credential support is later proposed, it requires a successor scope decision and new entries with authority evidence, schemas, origins, expiry, change control, and incident procedures.

## 6. Self-assertion policy

Persistent and ephemeral self-assertions:

- identify the holder as the signer and subject as defined by Core;
- use only owner-approved pinned schemas;
- are labeled `self-asserted-persistent` or `self-asserted-ephemeral`;
- never appear as issuer, BVS, source-provider, organizational-identity, or status evidence;
- remain unpublished by default;
- require exact request binding for ephemeral use and separate public-consequence consent for any future publication.

A valid holder signature proves the holder made the statement, not that the statement is true.

## 7. Origin configuration rules

Every configured origin must be an exact HTTPS origin. Configuration rejects:

- wildcard hosts, paths used as origin boundaries, userinfo, insecure HTTP, IP literals except controlled tests, alternate ports, fragments, and embedded credentials;
- redirects as a substitute for allowlisting the final origin;
- origins derived from input content, DNS discovery, links, request hints, or prior successful requests;
- the GitHub project Pages origin for real data;
- a same-origin assumption that grants protocol authority to `hiri-protocol.org` merely because it hosts the app.

Endpoint paths, methods, media types, response limits, timeouts, redirect behavior, purpose, and data classes must be configured per adapter. Origin allowlisting alone does not authorize an arbitrary endpoint.

## 8. Identity-anchor entries

A future identity anchor requires:

- exact authority and organization identifier;
- evidence type, issuer/source, URI/hash, and verification procedure;
- jurisdictions and permitted product uses;
- effective and expiry/review times;
- revocation/compromise procedure;
- named policy version and approving record.

Anchors never propagate from one authority to another and do not establish credential status. Expired, unavailable, contradictory, or unsupported evidence produces `unknown` or `invalid` as appropriate, never a cached success without provenance.

## 9. Current-head source entries

A future issuer-authoritative source requires an exact issuer authority, credential family/schema, source origin/path, authorization evidence, response signature/hash rules, freshness maximum, clock skew, cache policy, equivocation behavior, and rollback procedure.

`active` is permitted only when the Core status algorithm receives a fresh authenticated current head from that configured source and every required check succeeds. Offline or stale evidence retains source/capture time and cannot silently remain active.

## 10. Policy evaluation

Every relying-party policy has an immutable ID/version and returns `accepted`, `rejected`, or `not-evaluated` with evidence paths/reasons. Policy:

- runs after independent evidence computation;
- cannot rewrite evidence or hide failed/unknown dimensions;
- cannot infer issuer/verifier identity from display text;
- cannot treat a self-assertion as third-party evidence;
- cannot authorize an unsupported disclosure mode, algorithm, schema, or expired request;
- cannot create a conformance claim.

The initial policy list is empty, so `not-evaluated` is the only production-safe output.

## 11. Configuration lifecycle

Trust configuration is public, versioned, closed-shape, and hash-bound to one release. A change requires:

1. updated data-flow and threat analysis;
2. exact public values with no secrets;
3. positive, negative, expiry, rollback, redirect, and substitution tests;
4. review evidence for organizational and source authority claims;
5. owner-signed approval naming the configuration hash;
6. deployment and rollback evidence.

The same configuration version must never resolve to different bytes. An older version cannot replace a newer authenticated version. Emergency removal uses a signed control record and does not rewrite historical cryptographic evidence.

## 12. Approved baseline and remaining activation conditions

RHP-DR-002 D2-A approves the empty baseline in Section 2 and permits a cryptographically valid request from an identity-unknown verifier authority to reach informed consent only after every required control and dependency passes. The authenticated decision confirms:

- no issuer, BVS, resolver, current-head, identity-anchor, remote-resource, or HTTPS-delivery origins;
- file/paste ingress and file/clipboard egress only;
- all imported issuer/BVS artifacts remain unsupported or inspection-only;
- policy remains `not-evaluated`;
- additions require a new signed configuration decision.

The policy decision is complete, but the activation gate is not. Real request consent and real presentation signing remain disabled until the production resource set, request validation, replay storage, hostile-text rendering, complete-public preview, mandatory WebAuthn UV, signing, local delivery, threat-model re-review, and applicable release gates pass. Any non-empty trust entry or network ingress/egress requires a successor signed decision.
