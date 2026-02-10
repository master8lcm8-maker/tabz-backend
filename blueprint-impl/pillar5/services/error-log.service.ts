import { P5ErrorLog } from "../contracts/pillar5.contracts";

export function buildErrorLog(message: string, traceId: string): P5ErrorLog {
  return { message, traceId, at: new Date().toISOString(), level: "error" };
}
