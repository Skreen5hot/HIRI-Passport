import { parseUtcSeconds } from "./scalars.mjs";

function result(value, fallback = "unknown") { return value?.result ?? fallback; }

export function buildVerificationReport({ verifiedAt, parameters = {}, request, holder, credentials = [], selfAssertions = [], policy, errors = [] }) {
  parseUtcSeconds(verifiedAt);
  const messageClockSkewSeconds = parameters.messageClockSkewSeconds ?? 0;
  const credentialIssuanceToleranceSeconds = parameters.credentialIssuanceToleranceSeconds ?? 0;
  const report = {
    protocol: "hiri-passport/2.0",
    type: "PassportVerificationReport",
    verifiedAt,
    verificationParameters: { messageClockSkewSeconds, credentialIssuanceToleranceSeconds },
    request: structuredClone(request ?? { result: "unknown" }),
    holder: structuredClone(holder ?? { result: "unknown" }),
    credentials: structuredClone(credentials),
    selfAssertions: structuredClone(selfAssertions),
    policy: structuredClone(policy ?? { result: "not-evaluated" }),
    errors: structuredClone(errors)
  };
  report.cryptographicDisposition = deriveCryptographicDisposition(report);
  return report;
}

export function deriveCryptographicDisposition(report) {
  const checks = [result(report.request), result(report.holder), ...(report.credentials ?? []).map((item) => result(item)), ...(report.selfAssertions ?? []).map((item) => result(item))];
  if (checks.includes("invalid")) return "invalid";
  if (checks.includes("unknown")) return "unknown";
  return "valid";
}
