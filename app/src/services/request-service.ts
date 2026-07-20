import { parseIngressJson, type IngressEnvelope } from "./ingress";

export type RequestValidation = { result: "valid" | "invalid"; request?: Record<string, unknown>; reasons: string[]; envelope?: IngressEnvelope };

export function validateRequestIngress(text: string, now = new Date()): RequestValidation {
  try {
    const envelope = parseIngressJson(text, "paste");
    const request = envelope.value as Record<string, unknown>;
    const reasons: string[] = [];
    if (request.protocol !== "hiri-passport/2.0" || request.type !== "DisclosureRequest") reasons.push("Unsupported request protocol or type.");
    if (typeof request.requestId !== "string" || typeof request.nonce !== "string") reasons.push("Request binding values are missing.");
    const expires = typeof request.expiresAt === "string" ? Date.parse(request.expiresAt) : NaN;
    if (!Number.isFinite(expires) || expires <= now.getTime()) reasons.push("The request is expired or has no valid expiry.");
    return reasons.length ? { result: "invalid", reasons, request, envelope } : { result: "valid", reasons, request, envelope };
  } catch (error) {
    return { result: "invalid", reasons: [error instanceof Error ? error.message : "Request could not be parsed."] };
  }
}
