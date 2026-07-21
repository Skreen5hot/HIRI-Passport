const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const HEX_256 = /^[0-9a-f]{64}$/u;
const UTC_SECONDS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fail(message) {
  throw new TypeError(message);
}

export function unicodeScalarLength(value) {
  if (typeof value !== "string") fail("value must be a string");
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail("string contains an unpaired surrogate");
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail("string contains an unpaired surrogate");
    }
    count += 1;
  }
  return count;
}

export function decodeBase64Url(value, expectedBytes) {
  if (typeof value !== "string" || !value.length || value.includes("=") || !BASE64URL.test(value)) {
    fail("value must be canonical unpadded base64url");
  }
  if (value.length % 4 === 1) fail("invalid base64url length");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let bits = 0;
  let bitCount = 0;
  const out = [];
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) fail("invalid base64url character");
    bits = (bits << 6) | digit;
    bitCount += 6;
    while (bitCount >= 8) {
      bitCount -= 8;
      out.push((bits >>> bitCount) & 0xff);
      bits &= (1 << bitCount) - 1;
    }
  }
  if (bitCount && bits !== 0) fail("non-canonical base64url trailing bits");
  const bytes = Uint8Array.from(out);
  if (expectedBytes != null && bytes.length !== expectedBytes) {
    fail(`decoded value must be exactly ${expectedBytes} bytes`);
  }
  if (encodeBase64Url(bytes) !== value) fail("non-canonical base64url encoding");
  return bytes;
}

export function encodeBase64Url(bytes) {
  if (!(bytes instanceof Uint8Array)) fail("bytes must be Uint8Array");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  let bits = 0;
  let bitCount = 0;
  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 6) {
      bitCount -= 6;
      out += alphabet[(bits >>> bitCount) & 63];
      bits &= (1 << bitCount) - 1;
    }
  }
  if (bitCount) out += alphabet[(bits << (6 - bitCount)) & 63];
  return out;
}

export function parseRandomId(value) {
  decodeBase64Url(value, 16);
  return value;
}

export function parseNonce(value) {
  decodeBase64Url(value, 32);
  return value;
}

export function parseUtcSeconds(value) {
  if (typeof value !== "string") fail("timestamp must be a string");
  const match = UTC_SECONDS.exec(value);
  if (!match) fail("timestamp must use YYYY-MM-DDTHH:mm:ssZ");
  const [, year, month, day, hour, minute, second] = match.map((item, index) => index === 0 ? item : Number(item));
  const milliseconds = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(milliseconds);
  const canonical = `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}Z`;
  if (!Number.isFinite(milliseconds) || canonical !== value) fail("timestamp is not a valid calendar date");
  return milliseconds;
}

export function parseAbsoluteUri(value, { allowFragment = false, maxScalars } = {}) {
  if (typeof value !== "string" || !value.length) fail("URI must be a non-empty string");
  if (maxScalars != null && unicodeScalarLength(value) > maxScalars) fail("URI exceeds scalar limit");
  if (value.startsWith("hiri://")) {
    const separator = value.indexOf("/", "hiri://".length);
    if (separator < 0) fail("HIRI URI must contain a resource path");
    const authority = value.slice("hiri://".length, separator);
    const remainder = value.slice(separator);
    parseEd25519Authority(authority);
    if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+(?:#[A-Za-z0-9._~!$&'()*+,;=:@%/?-]+)?$/u.test(remainder) ||
      remainder.includes("?") || (!allowFragment && remainder.includes("#"))) {
      fail("HIRI URI has an invalid resource path or fragment");
    }
    return value;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("URI must be absolute");
  }
  if (!parsed.protocol) fail("URI must be absolute");
  if (!allowFragment && parsed.hash) fail("URI fragment is not permitted");
  return value;
}

export function parseSha256Identifier(value) {
  if (typeof value !== "string" || !value.startsWith("sha256:") || !HEX_256.test(value.slice(7))) {
    fail("hash must be sha256 followed by 64 lowercase hexadecimal digits");
  }
  return value;
}

export function parseClaimPointer(value) {
  if (typeof value !== "string" || (value !== "/claims" && !value.startsWith("/claims/"))) {
    fail("JSON Pointer must be rooted at /claims");
  }
  const tokens = value.split("/").slice(1);
  for (const token of tokens) {
    if (/~(?![01])/u.test(token)) fail("invalid JSON Pointer escape");
    const decoded = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (decoded === "-" || /^(?:0|[1-9]\d*)$/u.test(decoded)) fail("array tokens are not permitted");
  }
  return value;
}

export function decodeBase58Btc(value, expectedBytes) {
  if (typeof value !== "string" || !value.startsWith("z") || value.length < 2) fail("value must be base58btc multibase");
  let bytes = [0];
  for (const char of value.slice(1)) {
    const digit = BASE58.indexOf(char);
    if (digit < 0) fail("invalid base58btc character");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index] * 58 + carry;
      bytes[index] = next & 0xff;
      carry = next >>> 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>>= 8;
    }
  }
  const payload = value.slice(1);
  for (let index = 0; index < payload.length - 1 && payload[index] === "1"; index += 1) {
    bytes.push(0);
  }
  const result = Uint8Array.from(bytes.reverse());
  if (expectedBytes != null && result.length !== expectedBytes) fail(`decoded value must be exactly ${expectedBytes} bytes`);
  return result;
}

export function encodeBase58Btc(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) fail("bytes must be a non-empty Uint8Array");
  let leadingZeroes = 0;
  while (leadingZeroes < bytes.length && bytes[leadingZeroes] === 0) leadingZeroes += 1;
  if (leadingZeroes === bytes.length) return `z${"1".repeat(leadingZeroes)}`;
  const digits = [0];
  for (const byte of bytes.slice(leadingZeroes)) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const next = digits[index] * 256 + carry;
      digits[index] = next % 58;
      carry = Math.floor(next / 58);
    }
    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = "1".repeat(leadingZeroes);
  for (let index = digits.length - 1; index >= 0; index -= 1) out += BASE58[digits[index]];
  return `z${out}`;
}

export function parseEd25519Authority(value) {
  if (typeof value !== "string" || !value.startsWith("key:ed25519:z")) fail("authority must be key:ed25519:z...");
  decodeBase58Btc(value.slice("key:ed25519:".length), 32);
  return value;
}

export function parseVerificationMethod(value) {
  if (typeof value !== "string" || !/^hiri:\/\/key:ed25519:z[^/]+\/key\/[^#]+#[^#]+$/u.test(value)) {
    fail("verification method must be a HIRI Ed25519 key URI");
  }
  const authority = value.slice("hiri://".length, value.indexOf("/key/"));
  parseEd25519Authority(authority);
  return value;
}

export function methodAuthority(value) {
  parseVerificationMethod(value);
  return value.slice("hiri://".length, value.indexOf("/key/"));
}

export function assertClosedObject(value, allowed, required = allowed, label = "object") {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const keys = Object.keys(value);
  const unknown = keys.filter((key) => !allowed.includes(key));
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length) fail(`${label} contains unknown member: ${unknown[0]}`);
  if (missing.length) fail(`${label} is missing member: ${missing[0]}`);
  return value;
}

export function assertPlainText(value, min, max, label = "text") {
  const length = unicodeScalarLength(value);
  if (length < min || length > max || /[\u0000-\u001f\u007f]/u.test(value)) fail(`${label} violates plain-text limits`);
  return value;
}
