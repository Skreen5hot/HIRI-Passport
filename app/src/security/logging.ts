import { redact } from "./privacy";
export function safeDiagnostic(code: string, details?: unknown) { return Object.freeze({ code, details: redact(details) }); }
