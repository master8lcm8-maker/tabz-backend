import * as fs from "fs";
import * as path from "path";

type Pillar3Evidence = {
  pillar: "pillar3";
  freeBoard: {
    dropCreationExists: boolean;
    inventoryTrackingExists: boolean;
    expiryHandlingExists: boolean;
    concurrencyProtectionExists: boolean;
  };
  claimRules: {
    perUserLimits: boolean;
    perVenueLimits: boolean;
    timeWindows: boolean;
    eligibilityValidation: boolean;
  };
  spotlight: {
    boostTriggerExists: boolean;
    durationMathExists: boolean;
    priorityResolutionExists: boolean;
  };
  liveFeedback: {
    successEvents: boolean;
    rejectionReasons: boolean;
    acknowledgements: boolean;
  };
  history: {
    claimHistoryReadable: boolean;
    dropHistoryReadable: boolean;
    boostHistoryReadable: boolean;
  };
  abusePrevention: {
    rateLimitingExists: boolean;
    farmingDetectionExists: boolean;
    anomalyFlagsExist: boolean;
  };
};

function walkFiles(root: string, exts = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md"])): string[] {
  if (!root || !fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];

  while (stack.length) {
    const cur = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (exts.has(path.extname(full))) out.push(full);
    }
  }
  return out;
}

function fileContains(filePath: string, needles: RegExp[]): boolean {
  let txt: string;
  try {
    txt = fs.readFileSync(filePath, "utf8");
  } catch {
    return false;
  }
  return needles.every((r) => r.test(txt));
}

function anyFileContains(files: string[], needles: RegExp[]): boolean {
  return files.some((f) => fileContains(f, needles));
}

/**
 * Pillar 3 detector:
 * ONLY scans evidence/pillar3 (prevents false greens from unrelated repo code).
 */
export function detectPillar3(repoRoot: string): Pillar3Evidence {
  const evidenceRoot = path.join(repoRoot, "evidence", "pillar3");
  const files = walkFiles(evidenceRoot);

  const hasDropEntity =
    anyFileContains(files, [/class\s+\w*Drop\w*\s+/i, /@Entity\(/i]) ||
    anyFileContains(files, [/name:\s*["']drop["']/i, /@Entity\(/i]);

  const hasExpiry =
    anyFileContains(files, [/expiresAt/i]) ||
    anyFileContains(files, [/expiry/i]) ||
    anyFileContains(files, [/cron/i, /expiry/i]);

  const hasConcurrency =
    anyFileContains(files, [/transaction/i, /pessimistic/i]) ||
    anyFileContains(files, [/FOR\s+UPDATE/i]) ||
    anyFileContains(files, [/QueryRunner/i, /startTransaction/i]);

  const hasRulesEngine =
    anyFileContains(files, [/eligibility/i, /rules/i]) ||
    anyFileContains(files, [/perUser/i]) ||
    anyFileContains(files, [/perVenue/i]) ||
    anyFileContains(files, [/cooldown/i]);

  const hasSpotlight =
    anyFileContains(files, [/spotlight/i]) ||
    anyFileContains(files, [/boost/i, /duration/i]) ||
    anyFileContains(files, [/priority/i, /queue/i]);

  const hasLiveFeedback =
    anyFileContains(files, [/websocket/i]) ||
    anyFileContains(files, [/emit\(/i, /event/i]) ||
    anyFileContains(files, [/ack/i, /event/i]) ||
    anyFileContains(files, [/toast/i]);

  const hasHistory =
    anyFileContains(files, [/history/i, /timeline/i]) ||
    anyFileContains(files, [/activity/i, /feed/i]) ||
    anyFileContains(files, [/immutable/i, /log/i]);

  const hasRateLimit =
    anyFileContains(files, [/rate[-_ ]?limit/i]) ||
    anyFileContains(files, [/throttle/i]) ||
    anyFileContains(files, [/nestjs\/throttler/i]);

  const hasFarming =
    anyFileContains(files, [/farm/i, /detect/i]) ||
    anyFileContains(files, [/abuse/i, /score/i]) ||
    anyFileContains(files, [/anomaly/i]);

  return {
    pillar: "pillar3",
    freeBoard: {
      dropCreationExists: hasDropEntity,
      inventoryTrackingExists: hasDropEntity,
      expiryHandlingExists: hasExpiry,
      concurrencyProtectionExists: hasConcurrency,
    },
    claimRules: {
      perUserLimits: hasRulesEngine,
      perVenueLimits: hasRulesEngine,
      timeWindows: hasRulesEngine,
      eligibilityValidation: hasRulesEngine,
    },
    spotlight: {
      boostTriggerExists: hasSpotlight,
      durationMathExists: hasSpotlight,
      priorityResolutionExists: hasSpotlight,
    },
    liveFeedback: {
      successEvents: hasLiveFeedback,
      rejectionReasons: hasLiveFeedback,
      acknowledgements: hasLiveFeedback,
    },
    history: {
      claimHistoryReadable: hasHistory,
      dropHistoryReadable: hasHistory,
      boostHistoryReadable: hasHistory,
    },
    abusePrevention: {
      rateLimitingExists: hasRateLimit,
      farmingDetectionExists: hasFarming,
      anomalyFlagsExist: hasFarming,
    },
  };
}
