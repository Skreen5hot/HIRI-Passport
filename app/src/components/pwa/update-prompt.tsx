export function UpdatePrompt({ registration, busy = false, activating = false, onActivate }: { registration: ServiceWorkerRegistration | null; busy?: boolean; activating?: boolean; onActivate: () => void }) {
  if (!registration?.waiting) return null;
  const message = busy ? "Update waits until this sensitive action finishes." : activating ? "Applying the reviewed update…" : "A reviewed application update is ready.";
  return <aside className="lifecycle-card" role="status" aria-live="polite"><span>{message}</span><button disabled={busy || activating} onClick={onActivate}>{activating ? "Applying update" : "Reload to update"}</button></aside>;
}
