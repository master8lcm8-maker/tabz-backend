import { P3EngagementLogEntry } from "../contracts/pillar3.contracts";

export function appendLog(log: P3EngagementLogEntry[], entry: P3EngagementLogEntry): P3EngagementLogEntry[] {
  return [...log, entry]; // append-only
}
