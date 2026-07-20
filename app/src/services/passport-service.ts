import { createPassportSdk } from "../../../src/sdk/passport.mjs";

export type PassportPorts = Record<string, unknown>;

export function createPassportService(ports: PassportPorts = {}) {
  const sdk = createPassportSdk(ports);
  return Object.freeze({
    parse: (text: string) => sdk.parse.json(text),
    verify: (input: Record<string, unknown>) => sdk.verifyPassport(input),
    resolve: (reference: Record<string, unknown>) => sdk.resolver.resolve(reference)
  });
}
