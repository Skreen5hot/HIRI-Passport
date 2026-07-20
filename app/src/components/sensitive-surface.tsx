import type { ReactNode } from "react";
export function SensitiveSurface({ label, children }: { label: string; children: ReactNode }) { return <section className="panel" aria-label={label} data-sensitive="true">{children}</section>; }
