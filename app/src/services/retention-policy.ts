export type RetentionDecision = "none" | "report-only";
export const DEFAULT_RETENTION: RetentionDecision = "none";
export function describeRetention(decision: RetentionDecision) { return decision === "none" ? "No claims or report are retained after this view closes." : "Only the verification report is retained locally; imported claim payloads are discarded."; }
