import { validateRequestIngress } from "./request-service";
import { replayKey } from "../storage/replay-store";

export async function inspectRequest(text: string, now = new Date()) {
  const validation = validateRequestIngress(text, now);
  const request = validation.request;
  return { ...validation, replayTuple: request ? replayKey(String(request.requestId), String(request.nonce)) : undefined };
}
