import { useRef, type ReactNode } from "react";
export function ConfirmationDialog({ title, children, confirmLabel, onConfirm, onCancel }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <div className="dialog-backdrop" role="presentation"><section className="dialog panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">{title}</h2>{children}<div className="actions"><button className="button danger" onClick={onConfirm}>{confirmLabel}</button><button ref={cancel} autoFocus className="button secondary" onClick={onCancel}>Cancel</button></div></section></div>;
}
