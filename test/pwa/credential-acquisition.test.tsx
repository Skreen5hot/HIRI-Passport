import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImportProvenance, ImportedJsonDocument } from "../../app/src/adapters/import-source";
import { AcquireRoute } from "../../app/src/routes/acquire/acquire";
import type {
  AcquisitionEvidenceSet,
  AcquisitionInspection,
  AcquisitionService
} from "../../app/src/services/acquisition-service";

const NOW = "2026-07-21T12:00:00Z";
afterEach(cleanup);
const evidence = Object.freeze({
  structure: Object.freeze({ state: "valid" as const, code: "RHP_IMPORT_STRUCTURE_CLASSIFIED" }),
  resourceAvailability: Object.freeze({ state: "valid" as const, code: "RHP_RESOURCE_REGISTRY_READY" }),
  contentHash: Object.freeze({ state: "valid" as const, code: "RHP_CONTENT_HASH_VALID" }),
  signature: Object.freeze({ state: "unknown" as const, code: "KEY_STATE_UNKNOWN" }),
  methodAuthorization: Object.freeze({ state: "unknown" as const, code: "KEY_STATE_UNKNOWN" }),
  chain: Object.freeze({ state: "unknown" as const, code: "KEY_STATE_UNKNOWN" }),
  schema: Object.freeze({ state: "valid" as const, code: "RHP_EVIDENCE_VALID" }),
  subjectBinding: Object.freeze({ state: "valid" as const, code: "RHP_SUBJECT_HOLDER_BINDING_VALID" }),
  status: Object.freeze({ state: "unknown" as const, code: "CURRENT_HEAD_UNKNOWN" }),
  issuerIdentity: Object.freeze({ state: "unknown" as const, code: "RHP_IDENTITY_ANCHORS_EMPTY" }),
  bvsProfile: Object.freeze({ state: "unknown" as const, code: "RHP_BVS_NOT_APPLICABLE" }),
  bvsIdentity: Object.freeze({ state: "unknown" as const, code: "RHP_BVS_NOT_APPLICABLE" }),
  policy: Object.freeze({ state: "not-evaluated" as const, code: "RHP_POLICY_NOT_EVALUATED" }),
  cryptography: Object.freeze({ state: "unknown" as const, code: "RHP_CREDENTIAL_CRYPTOGRAPHY" })
}) satisfies AcquisitionEvidenceSet;

function inspection(provenance: ImportProvenance): AcquisitionInspection {
  return Object.freeze({
    result: "inspection-only" as const,
    code: "RHP_ACQUISITION_INSPECTION_ONLY" as const,
    kind: "credential" as const,
    disposition: "inspection-only" as const,
    trusted: false as const,
    previewIssued: false as const,
    canPersist: false as const,
    activation: "prohibited" as const,
    networkAccess: "disabled" as const,
    persistence: "not-performed" as const,
    importHash: `sha256:${"a".repeat(64)}`,
    provenance,
    evidence,
    items: Object.freeze([Object.freeze({
      provenance: "direct-issuer" as const,
      credentialType: "<img src=x onerror=alert(1)>",
      issuerAuthority: `key:ed25519:z${"1".repeat(32)}`,
      subjectHolderAuthority: `key:ed25519:z${"1".repeat(32)}`,
      manifestHash: `sha256:${"b".repeat(64)}`,
      contentHash: `sha256:${"c".repeat(64)}`,
      schema: "https://hiri-protocol.org/schema",
      schemaHash: `sha256:${"d".repeat(64)}`,
      evidence
    })])
  });
}

function service() {
  const inspect = vi.fn(async (imported: ImportedJsonDocument) => inspection(imported.provenance));
  return {
    inspect,
    value: Object.freeze({
      disposition: "inspection-only" as const,
      networkAccess: "disabled" as const,
      persistence: "prohibited" as const,
      inspect
    }) satisfies AcquisitionService
  };
}

describe("credential acquisition route", () => {
  it("fails closed when production verification dependencies are not composed", () => {
    render(<AcquireRoute now={() => NOW} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/inspection is unavailable/iu);
    expect(screen.getByRole("button", { name: "Inspect pasted JSON" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Choose JSON file" })).toBeDisabled();
  });

  it("inspects pasted JSON, renders dimensions independently, and offers no add path", async () => {
    const local = service();
    render(<AcquireRoute service={local.value} now={() => NOW} />);
    fireEvent.change(screen.getByLabelText(/paste credential pair/iu), { target: { value: "{}" } });
    fireEvent.click(screen.getByRole("button", { name: "Inspect pasted JSON" }));

    await screen.findByRole("heading", { name: "Inspection only" });
    expect(local.inspect).toHaveBeenCalledOnce();
    expect(screen.getByText("Signature")).toBeVisible();
    expect(screen.getByText("Current status")).toBeVisible();
    expect(screen.getByText("Issuer identity")).toBeVisible();
    expect(screen.getByText("Policy")).toBeVisible();
    expect(screen.getByText(/No issuer credential is trusted or preview-issued/iu)).toBeVisible();
    expect(screen.getByText(/This preview does not check whether a credential is currently valid/iu)).toBeVisible();
    expect(screen.queryByRole("button", { name: /add/iu })).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x/iu).tagName).toBe("BDI");
  });

  it("accepts only an explicit local file selection and preserves file provenance", async () => {
    const local = service();
    const { container } = render(<AcquireRoute service={local.value} now={() => NOW} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const bytes = new TextEncoder().encode("{}");
    const file = new File([bytes], "<unsafe>.json", { type: "application/json" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
    expect(file.size).toBe(bytes.length);
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(local.inspect).toHaveBeenCalledOnce());
    expect(screen.getByText("<unsafe>.json").tagName).toBe("BDI");
    const imported = local.inspect.mock.calls[0][0];
    expect(imported.provenance).toMatchObject({
      source: "file",
      fileName: "<unsafe>.json",
      network: "not-attempted",
      persistence: "not-performed"
    });
    expect(screen.queryByLabelText(/url|deep link|qr/iu)).toBeNull();
    expect(screen.queryByRole("button", { name: /add/iu })).toBeNull();
  });
});
