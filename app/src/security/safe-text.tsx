export function SafeText({ children, className }: { children: string; className?: string }) {
  return <bdi className={className} dir="auto">{children}</bdi>;
}

export function safeExternalText(value: unknown, maximum = 512): string {
  if (typeof value !== "string") return "";
  return [...value.replace(/[\u0000-\u001f\u007f]/gu, "�")].slice(0, maximum).join("");
}
