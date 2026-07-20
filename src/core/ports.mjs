const REQUIRED_PORTS = Object.freeze([
  "clock",
  "randomBytes",
  "ed25519",
  "sha256",
  "aesGcm",
  "x25519",
  "hkdfSha256",
  "protectedStorage",
  "hiriVerifier",
  "artifactResolver",
  "schemaLoader",
  "schemaValidator",
  "contextLoader",
  "identityAnchors",
  "policy"
]);

export const KERNEL_PORT_NAMES = REQUIRED_PORTS;

export function assertKernelPorts(ports) {
  if (!ports || typeof ports !== "object" || Array.isArray(ports)) {
    throw new TypeError("kernel ports must be an object");
  }
  const missing = REQUIRED_PORTS.filter((name) => ports[name] == null);
  if (missing.length) {
    throw new TypeError(`missing kernel ports: ${missing.join(", ")}`);
  }
  if (typeof ports.clock !== "function" || typeof ports.randomBytes !== "function") {
    throw new TypeError("clock and randomBytes ports must be functions");
  }
  return Object.freeze({ ...ports });
}

export function createKernelContext(ports, inputs = {}) {
  const checked = assertKernelPorts(ports);
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    throw new TypeError("kernel inputs must be an object");
  }
  return Object.freeze({ ports: checked, inputs: Object.freeze({ ...inputs }) });
}
