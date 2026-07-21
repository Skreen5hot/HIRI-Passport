import { useRef, useState } from "react";
import {
  importFromFile,
  importFromPaste,
  type ImportedJsonDocument
} from "../../adapters/import-source";
import type {
  AcquisitionInspection,
  AcquisitionService
} from "../../services/acquisition-service";
import { AcquisitionReview } from "./acquisition-review";

function protocolTime(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
}

export function AcquireRoute({
  service,
  holderAuthority,
  now = protocolTime
}: Readonly<{
  service?: AcquisitionService;
  holderAuthority?: string;
  now?: () => string;
}>) {
  const [text, setText] = useState("");
  const [inspection, setInspection] = useState<AcquisitionInspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const available = service !== undefined;

  async function inspect(imported: ImportedJsonDocument): Promise<void> {
    if (!service) return;
    setBusy(true);
    setError(null);
    try {
      setInspection(await service.inspect(imported, {
        now: now(),
        ...(holderAuthority ? { holderAuthority } : {})
      }));
    } catch {
      setError("The local inspection could not complete. No imported data was stored.");
    } finally {
      setBusy(false);
    }
  }

  async function inspectPaste(): Promise<void> {
    try {
      await inspect(importFromPaste(text, now()));
    } catch {
      setError("The pasted JSON is empty, too large, or not a valid local import source.");
    }
  }

  async function selectFile(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      await inspect(await importFromFile(file, now()));
    } catch {
      setError("The selected file is empty, too large, not JSON, or not valid UTF-8.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (inspection) {
    return <section className="stack">
      <header>
        <p className="eyebrow">Credential acquisition</p>
        <h1>Inspect evidence locally.</h1>
      </header>
      <AcquisitionReview inspection={inspection} onBack={() => {
        setInspection(null);
        setError(null);
      }} />
    </section>;
  }

  return <section className="stack">
    <header>
      <p className="eyebrow">Credential acquisition</p>
      <h1>Inspect evidence locally.</h1>
      <p className="lede">Paste an exact manifest/content pair or explicitly choose a Passport Presentation Package file. Imports are reviewed as untrusted input and are never added to this preview.</p>
    </header>

    <section className="panel stack" aria-labelledby="local-import-heading">
      <div>
        <h2 id="local-import-heading">Local JSON import</h2>
        <p className="muted">URL retrieval, QR scanning, deep links, drag-and-drop, and background imports are not available.</p>
      </div>

      {!available && <p role="alert" className="error-text">Local credential inspection is unavailable until the production runtime composes its approved resources and verification ports.</p>}
      {error && <p role="alert" className="error-text">{error}</p>}

      <div className="field">
        <label htmlFor="credential-json">Paste credential pair or package JSON</label>
        <textarea
          id="credential-json"
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="{ … }"
          autoComplete="off"
          spellCheck={false}
          disabled={!available || busy}
        />
      </div>

      <input
        ref={fileInput}
        hidden
        type="file"
        accept="application/json,application/ld+json,.json"
        aria-label="Choose local JSON file"
        onChange={event => void selectFile(event.currentTarget.files?.[0])}
        disabled={!available || busy}
      />

      <div className="actions">
        <button
          className="button"
          type="button"
          disabled={!available || busy || !text.trim()}
          onClick={() => void inspectPaste()}
        >{busy ? "Inspecting…" : "Inspect pasted JSON"}</button>
        <button
          className="button secondary"
          type="button"
          disabled={!available || busy}
          onClick={() => fileInput.current?.click()}
        >Choose JSON file</button>
      </div>
    </section>
  </section>;
}
