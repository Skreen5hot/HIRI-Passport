import { unicodeScalarLength } from "./scalars.mjs";

function canonical(value, seen, depth, limits) {
  if (depth > limits.maxDepth) throw new RangeError("JCS depth limit exceeded");
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") {
    unicodeScalarLength(value);
    if (value.length > limits.maxStringLength) throw new RangeError("JCS string limit exceeded");
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JCS numbers must be finite");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== "object" || value === undefined) throw new TypeError("value is not valid JCS data");
  if (seen.has(value)) throw new TypeError("cyclic JCS data is not permitted");
  seen.add(value);
  let output;
  if (Array.isArray(value)) {
    output = `[${value.map((item) => canonical(item, seen, depth + 1, limits)).join(",")}]`;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("JCS objects must be plain objects");
    const keys = Object.keys(value).sort();
    output = `{${keys.map((key) => {
      unicodeScalarLength(key);
      if (value[key] === undefined) throw new TypeError("undefined object members are not permitted");
      return `${JSON.stringify(key)}:${canonical(value[key], seen, depth + 1, limits)}`;
    }).join(",")}}`;
  }
  seen.delete(value);
  return output;
}

export function jcsString(value, limits = {}) {
  return canonical(value, new Set(), 0, {
    maxDepth: limits.maxDepth ?? 64,
    maxStringLength: limits.maxStringLength ?? 1024 * 1024
  });
}

export function jcsBytes(value, limits) {
  return new TextEncoder().encode(jcsString(value, limits));
}

export function bytesEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    if (!(part instanceof Uint8Array)) throw new TypeError("byte parts must be Uint8Array");
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function hex(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("bytes must be Uint8Array");
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
