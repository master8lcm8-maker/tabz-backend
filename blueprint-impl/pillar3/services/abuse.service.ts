import { P3RejectionCode } from "../contracts/pillar3.contracts";

export type AbuseInputs = {
  attemptsLastMinute: number;
  suspectedFarmPattern: boolean;
};

export function checkAbuse(i: AbuseInputs): { ok: true } | { ok: false; reasonCode: P3RejectionCode } {
  if (i.attemptsLastMinute > 30) return { ok: false, reasonCode: P3RejectionCode.ABUSE_BLOCKED };
  if (i.suspectedFarmPattern) return { ok: false, reasonCode: P3RejectionCode.ABUSE_SUSPECTED };
  return { ok: true };
}
