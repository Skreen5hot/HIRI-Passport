import { useState, type MouseEvent, type ReactNode } from "react";
import { LocalAuthenticationError, type LocalAuthenticationOperation } from "../adapters/local-auth";

export type SensitiveSurfaceProps = Readonly<{
  label: string;
  operation: LocalAuthenticationOperation;
  actionLabel: string;
  children: ReactNode;
  execute(): Promise<void>;
  onComplete?(): void;
  cancelHref?: string;
}>;

function failureMessage(error: unknown): string {
  if (error instanceof LocalAuthenticationError) {
    switch (error.code) {
      case "RHP_LOCAL_AUTH_CANCELLED":
        return "Device verification was cancelled. The action did not run.";
      case "RHP_LOCAL_AUTH_EXPIRED":
        return "Device verification expired. Review the current state and try again.";
      case "RHP_LOCAL_AUTH_INVALIDATED":
      case "RHP_LOCAL_AUTH_STATE_CHANGED":
        return "The page or protected state changed. The action was blocked.";
      case "RHP_LOCAL_AUTH_UNSUPPORTED":
      case "RHP_LOCAL_AUTH_NOT_ENROLLED":
        return "Required device verification is unavailable. The action was blocked.";
      default:
        return "Device verification failed. The action did not run.";
    }
  }
  return "The protected action did not complete.";
}

/**
 * A UI shell for a service-enforced sensitive operation. `execute` must call a
 * domain service whose authorization port performs WebAuthn immediately before
 * its side effect; this component never turns a UI click into authorization.
 */
export function SensitiveSurface({
  label,
  operation,
  actionLabel,
  children,
  execute,
  onComplete,
  cancelHref
}: SensitiveSurfaceProps) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      await execute();
      onComplete?.();
    } catch (error) {
      setFailure(failureMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const guardNestedControls = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target.closest("a,button,input,select,textarea") : null;
    if (target && !target.hasAttribute("data-sensitive-action") && !target.hasAttribute("data-sensitive-exit")) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return <section
    className="panel stack"
    aria-label={label}
    data-sensitive="true"
    data-local-auth-required="true"
    data-sensitive-operation={operation}
    onClickCapture={guardNestedControls}
  >
    {children}
    <p className="muted">A fresh device-verification prompt must complete inside the protected service. It is a local gate, not Passport evidence.</p>
    {failure ? <p role="alert">{failure}</p> : null}
    <div className="actions">
      <button
        className="button"
        type="button"
        data-sensitive-action="true"
        disabled={busy}
        onClick={() => void run()}
      >{busy ? "Waiting for device verificationâ€¦" : actionLabel}</button>
      {cancelHref ? <a className="button secondary" data-sensitive-exit="true" href={cancelHref}>Cancel</a> : null}
    </div>
  </section>;
}
