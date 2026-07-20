import { probeCryptoCapabilities } from "../adapters/crypto-capabilities";

export async function assessOnboardingReadiness() {
  const capabilities = await probeCryptoCapabilities();
  return { capabilities, canCreateRealAuthority: capabilities.protocolReady, mode: capabilities.protocolReady ? "holder-preview" : "synthetic-demo" } as const;
}
