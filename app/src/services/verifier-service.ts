import { createPassportService, type PassportPorts } from "./passport-service";
import { parseIngressJson } from "./ingress";

export async function verifyImportedPresentation(requestText: string, packageText: string, now: string, ports: PassportPorts = {}) {
  const request = parseIngressJson(requestText, "paste").value as Record<string, unknown>;
  const packageValue = parseIngressJson(packageText, "paste").value as { presentation?: Record<string, unknown> };
  const presentation = packageValue.presentation ?? packageValue;
  return createPassportService(ports).verify({ request, presentation, now, parameters: { messageClockSkewSeconds: 0, credentialIssuanceToleranceSeconds: 0 }, policy: { id: "synthetic-review", version: "1", rules: [] } });
}
