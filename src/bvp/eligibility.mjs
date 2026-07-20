const OUTSIDE = new Set(["health", "education", "financial", "background-check"]);
const SENSITIVE = new Set(["email", "phone", "private-employment", "workspace-membership", "social-account", "government-identity"]);
const PUBLIC = new Set(["public-professional-license", "public-organizational-role"]);

export function evaluateCredentialEligibility({ classification, completeDisclosureJustification, holderAuthorization, legalPolicy = {} }) {
  if (OUTSIDE.has(classification)) return { result: "ineligible", reason: "outside-public-core" };
  if (!PUBLIC.has(classification) || SENSITIVE.has(classification)) return { result: "ineligible", reason: "default-ineligible" };
  if (legalPolicy.allowedClasses?.includes(classification) !== true || completeDisclosureJustification !== true || holderAuthorization !== true) return { result: "ineligible", reason: "complete-publication-not-authorized" };
  if (legalPolicy.selective === true) return { result: "ineligible", reason: "selective-disclosure-blocked" };
  return { result: "eligible", disclosureMode: "public" };
}
