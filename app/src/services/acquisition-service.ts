import { parseIngressJson } from "./ingress";
import type { CredentialRecord } from "../types";

export function reviewCredentialImport(text: string): { result: "review" | "blocked"; record?: CredentialRecord; reasons: string[] } {
  try {
    const value = parseIngressJson(text, "paste").value as Record<string, unknown>;
    if (value.type !== "HIRICredential" && value.type !== "PassportPresentationPackage") return { result: "blocked", reasons: ["The object is not a supported credential or package."] };
    return { result: "review", reasons: ["Cryptographic and current-status evidence must be resolved before activation."] };
  } catch (error) { return { result: "blocked", reasons: [error instanceof Error ? error.message : "Import failed."] }; }
}
