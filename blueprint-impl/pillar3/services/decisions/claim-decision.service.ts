/**
 * Slice A — Claim decision engine (skeleton).
 * Implements the invariant order and returns a deterministic accept/reject decision.
 * NOTE: No DB. No wiring. No src imports.
 */

import { P3Decision, P3ReasonCode, accept, reject } from "../policies/reason-codes";

export type ClaimAttempt = {
  dropId: number;
  userId: number;
  venueId: number;
  nowIso: string; // external clock injected
  requestedQty?: number; // default 1
  // Optional "context flags" (would be derived later)
  dropExists?: boolean;
  isExpired?: boolean;
  hasStock?: boolean;
  userCooldownActive?: boolean;
  userLimitReached?: boolean;
  venueLimitReached?: boolean;
  eligible?: boolean;
  timeWindowOpen?: boolean;
  concurrencyOk?: boolean;
  abuseDecision?: "ALLOW" | "SUSPECT" | "BLOCK";
};

export type ClaimAccepted = {
  claimIdPlanned: string; // deterministic placeholder id
  qtyGranted: number;
};

export class ClaimDecisionService {
  decide(input: ClaimAttempt): P3Decision<ClaimAccepted> {
    const qty = input.requestedQty ?? 1;

    if (input.dropExists === false) return reject(P3ReasonCode.DROP_NOT_FOUND);
    if (input.isExpired === true) return reject(P3ReasonCode.DROP_EXPIRED);
    if (input.hasStock === false) return reject(P3ReasonCode.DROP_OUT_OF_STOCK);

    if (input.userCooldownActive === true) return reject(P3ReasonCode.USER_COOLDOWN_ACTIVE);
    if (input.userLimitReached === true) return reject(P3ReasonCode.USER_LIMIT_REACHED);
    if (input.venueLimitReached === true) return reject(P3ReasonCode.VENUE_LIMIT_REACHED);

    if (input.eligible === false) return reject(P3ReasonCode.NOT_ELIGIBLE);
    if (input.timeWindowOpen === false) return reject(P3ReasonCode.TIME_WINDOW_CLOSED);

    if (input.concurrencyOk === false) return reject(P3ReasonCode.CONCURRENCY_CONFLICT);

    if (input.abuseDecision === "BLOCK") return reject(P3ReasonCode.ABUSE_BLOCKED);
    if (input.abuseDecision === "SUSPECT") return reject(P3ReasonCode.ABUSE_SUSPECTED);

    // deterministic placeholder id (no randomness)
    const claimIdPlanned = `P3-CLAIM-${input.dropId}-${input.userId}-${input.nowIso}`;
    return accept({ claimIdPlanned, qtyGranted: qty });
  }
}
