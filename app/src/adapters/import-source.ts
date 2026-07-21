import { parseUtcSeconds } from "../../../src/core/scalars.mjs";
import { PACKAGE_LIMITS } from "../../../src/core/presentation-package.mjs";

export const ACQUISITION_IMPORT_LIMITS = Object.freeze({
  bytes: PACKAGE_LIMITS.packageBytes,
  fileNameScalars: 255
});

export type ImportSourceErrorCode =
  | "RHP_IMPORT_SOURCE_INVALID"
  | "RHP_IMPORT_LIMIT_EXCEEDED"
  | "RHP_IMPORT_ENCODING_INVALID";

export class ImportSourceError extends TypeError {
  readonly code: ImportSourceErrorCode;

  constructor(code: ImportSourceErrorCode) {
    super(code);
    this.name = "ImportSourceError";
    this.code = code;
  }
}

export type ImportProvenance = Readonly<{
  source: "paste" | "file";
  receivedAt: string;
  originalByteLength: number;
  fileName: string | null;
  mediaType: string | null;
  transportAuthenticated: false;
  network: "not-attempted";
  persistence: "not-performed";
}>;

export type ImportedJsonDocument = Readonly<{
  text: string;
  provenance: ImportProvenance;
  bytes(): Uint8Array;
}>;

export type LocalJsonFile = Readonly<{
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const JSON_MEDIA_TYPES = new Set(["application/json", "application/ld+json", "text/json"]);

function invalid(code: ImportSourceErrorCode): never {
  throw new ImportSourceError(code);
}

function protocolTime(value: string): string {
  try {
    parseUtcSeconds(value);
  } catch {
    invalid("RHP_IMPORT_SOURCE_INVALID");
  }
  return value;
}

function boundedBytes(value: Uint8Array): Uint8Array {
  if (value.length === 0) invalid("RHP_IMPORT_SOURCE_INVALID");
  if (value.length > ACQUISITION_IMPORT_LIMITS.bytes) invalid("RHP_IMPORT_LIMIT_EXCEEDED");
  return new Uint8Array(value);
}

function decodeUtf8(value: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    invalid("RHP_IMPORT_ENCODING_INVALID");
  }
}

function document(
  bytes: Uint8Array,
  provenance: Omit<ImportProvenance, "originalByteLength" | "transportAuthenticated" | "network" | "persistence">
): ImportedJsonDocument {
  const original = boundedBytes(bytes);
  const text = decodeUtf8(original);
  return Object.freeze({
    text,
    provenance: Object.freeze({
      ...provenance,
      originalByteLength: original.length,
      transportAuthenticated: false as const,
      network: "not-attempted" as const,
      persistence: "not-performed" as const
    }),
    // Each caller receives a copy so imported bytes cannot be mutated through
    // an exposed reference after provenance has been recorded.
    bytes: () => new Uint8Array(original)
  });
}

export function importFromPaste(text: string, receivedAt: string): ImportedJsonDocument {
  if (typeof text !== "string") invalid("RHP_IMPORT_SOURCE_INVALID");
  return document(new TextEncoder().encode(text), {
    source: "paste",
    receivedAt: protocolTime(receivedAt),
    fileName: null,
    mediaType: null
  });
}

function boundedFileName(value: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    [...value].length > ACQUISITION_IMPORT_LIMITS.fileNameScalars ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) invalid("RHP_IMPORT_SOURCE_INVALID");
  return value;
}

function mediaType(value: string): string | null {
  if (typeof value !== "string") invalid("RHP_IMPORT_SOURCE_INVALID");
  if (value === "") return null;
  const normalized = value.toLowerCase().split(";", 1)[0].trim();
  if (!JSON_MEDIA_TYPES.has(normalized)) invalid("RHP_IMPORT_SOURCE_INVALID");
  return normalized;
}

export async function importFromFile(file: LocalJsonFile, receivedAt: string): Promise<ImportedJsonDocument> {
  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
    invalid("RHP_IMPORT_SOURCE_INVALID");
  }
  if (!Number.isInteger(file.size) || file.size <= 0) invalid("RHP_IMPORT_SOURCE_INVALID");
  if (file.size > ACQUISITION_IMPORT_LIMITS.bytes) invalid("RHP_IMPORT_LIMIT_EXCEEDED");

  const fileName = boundedFileName(file.name);
  const normalizedMediaType = mediaType(file.type);
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    invalid("RHP_IMPORT_SOURCE_INVALID");
  }
  // File objects can originate in a same-origin child browsing context, so an
  // instanceof check would reject a legitimate cross-realm ArrayBuffer.
  if (Object.prototype.toString.call(buffer) !== "[object ArrayBuffer]" || buffer.byteLength !== file.size) {
    invalid("RHP_IMPORT_SOURCE_INVALID");
  }

  return document(new Uint8Array(buffer), {
    source: "file",
    receivedAt: protocolTime(receivedAt),
    fileName,
    mediaType: normalizedMediaType
  });
}
