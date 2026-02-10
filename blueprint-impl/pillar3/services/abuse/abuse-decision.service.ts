/**
 * Slice A — Abuse decision aggregator (skeleton).
 * Deterministic precedence: BLOCK > SUSPECT > ALLOW
 */

import { AbuseOutcome, AbuseSignal } from "./abuse.contracts";
import { RateLimitService } from "./rate-limit.service";
import { FarmingDetectionService } from "./farming-detection.service";
import { AnomalyFlagsService, AnomalyInput } from "./anomaly-flags.service";

export class AbuseDecisionService {
  private rate = new RateLimitService();
  private farming = new FarmingDetectionService();
  private anomaly = new AnomalyFlagsService();

  decide(signal: AbuseSignal, anomaly: AnomalyInput = {}): AbuseOutcome {
    const a = this.rate.evaluate(signal);
    const b = this.farming.evaluate(signal);
    const c = this.anomaly.evaluate(anomaly).outcome;

    if (a === "BLOCK" || b === "BLOCK" || c === "BLOCK") return "BLOCK";
    if (a === "SUSPECT" || b === "SUSPECT" || c === "SUSPECT") return "SUSPECT";
    return "ALLOW";
  }
}
