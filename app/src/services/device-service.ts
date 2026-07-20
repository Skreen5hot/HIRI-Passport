export type LocalDevice = { id: string; label: string; method: string; state: "active" | "removed" | "compromised" };

export function rotateDevice(devices: LocalDevice[], currentId: string, successor: LocalDevice) {
  if (!devices.some(device => device.id === currentId && device.state === "active")) throw new Error("Current active method is unavailable.");
  if (successor.state !== "active" || successor.id === currentId) throw new Error("A distinct usable successor is required.");
  return devices.map(device => device.id === currentId ? { ...device, state: "removed" as const } : device).concat(successor);
}

export function removalWarning() { return "Removing this recipient prevents future decryption but cannot retract ciphertext already received."; }
