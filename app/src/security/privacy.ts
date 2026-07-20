const sensitive = /(?:private|secret|signingKey|x25519Key|contentKey|plaintext|sourceToken|password|nonce|claim)/iu;
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sensitive.test(key) ? "[REDACTED]" : redact(child)]));
  return value;
}
export function isSensitiveRoute(path: string) { return ["/request", "/settings", "/acquire"].some(prefix => path.startsWith(prefix)); }
