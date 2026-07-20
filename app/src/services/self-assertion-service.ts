export type SelfAssertionDraft = { label: string; value: string; persistence: "ephemeral" | "persistent" };

export function validateSelfAssertion(draft: SelfAssertionDraft) {
  const errors: string[] = [];
  if (!draft.label.trim()) errors.push("A field label is required.");
  if (!draft.value.trim()) errors.push("A value is required.");
  if (draft.label.length > 120 || draft.value.length > 2_000) errors.push("The assertion exceeds local limits.");
  return { result: errors.length ? "invalid" : "valid", errors } as const;
}
