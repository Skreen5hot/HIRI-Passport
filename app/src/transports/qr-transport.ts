export const MAX_QR_BYTES = 1_500;
export function qrCarrier(bytes: Uint8Array) { if (bytes.byteLength > MAX_QR_BYTES) throw new RangeError("Signed presentation is too large for the configured QR carrier."); return new TextDecoder().decode(bytes); }
