import * as fs from "fs";
import * as path from "path";

type Pillar4Evidence = {
  pillar: "pillar4";

  affiliate: {
    codeGenerationExists: boolean;
    attributionOnSignupExists: boolean;
    inviterBindingExists: boolean;
    rewardEventsExist: boolean;
    fraudPreventionExists: boolean;
  };

  viralSharing: {
    sharePayloadExists: boolean;
    deepLinkRoutingExists: boolean;
    osShareIntegrationExists: boolean;
  };

  retention: {
    streakLogicExists: boolean;
    returnIncentivesExist: boolean;
    timedEventsExist: boolean;
  };

  attribution: {
    referralToSignupTracked: boolean;
    signupToActionTracked: boolean;
    rewardEligibilityTraceable: boolean;
  };
};

function walkFiles(root: string, exts = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yml", ".yaml"])): string[] {
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
 * Pillar 4 detector:
 * ONLY scans evidence/pillar4 to prevent false greens from unrelated repo code.
 */
export function detectPillar4(repoRoot: string): Pillar4Evidence {
  const evidenceRoot = path.join(repoRoot, "evidence", "pillar4");
  const files = walkFiles(evidenceRoot);

  const hasReferralCodeGen =
    anyFileContains(files, [/referral/i, /code/i, /generate/i]) ||
    anyFileContains(files, [/invite/i, /code/i, /generate/i]) ||
    anyFileContains(files, [/affiliate/i, /code/i]) ||
    anyFileContains(files, [/shortcode/i]) ||
    anyFileContains(files, [/createReferral/i]);

  const hasAttributionOnSignup =
    anyFileContains(files, [/referredBy/i]) ||
    anyFileContains(files, [/referralId/i]) ||
    anyFileContains(files, [/inviterId/i]) ||
    anyFileContains(files, [/utm_/i]) ||
    anyFileContains(files, [/attribution/i, /signup/i]);

  const hasInviterBinding =
    anyFileContains(files, [/inviter/i, /invited/i]) ||
    anyFileContains(files, [/referrer/i, /referred/i]) ||
    anyFileContains(files, [/bind/i, /inviter/i]) ||
    anyFileContains(files, [/relationship/i, /referral/i]);

  const hasRewardEvents =
    anyFileContains(files, [/referral/i, /reward/i]) ||
    anyFileContains(files, [/affiliate/i, /reward/i]) ||
    anyFileContains(files, [/reward/i, /credits/i]) ||
    anyFileContains(files, [/credits_ledger/i, /referral/i]) ||
    anyFileContains(files, [/ledger/i, /referral/i]) ||
    anyFileContains(files, [/bonus/i, /referral/i]);

  const hasFraudPrevention =
    anyFileContains(files, [/fraud/i]) ||
    anyFileContains(files, [/anti[-_ ]?fraud/i]) ||
    anyFileContains(files, [/abuse/i, /referral/i]) ||
    anyFileContains(files, [/rate[-_ ]?limit/i, /referral/i]) ||
    anyFileContains(files, [/device/i, /fingerprint/i]) ||
    anyFileContains(files, [/ip/i, /block/i]);

  const hasSharePayload =
    anyFileContains(files, [/share/i, /payload/i]) ||
    anyFileContains(files, [/invite/i, /message/i]) ||
    anyFileContains(files, [/share/i, /text/i]) ||
    anyFileContains(files, [/share/i, /url/i]);

  const hasDeepLinkRouting =
    anyFileContains(files, [/deep\s*link/i]) ||
    anyFileContains(files, [/deeplink/i]) ||
    anyFileContains(files, [/universal\s*link/i]) ||
    anyFileContains(files, [/expo-linking/i]) ||
    anyFileContains(files, [/linking/i, /prefix/i]);

  const hasOSShareIntegration =
    anyFileContains(files, [/Share\.share/i]) ||
    anyFileContains(files, [/react-native/i, /Share/i]) ||
    anyFileContains(files, [/navigator\.share/i]);

  const hasStreakLogic =
    anyFileContains(files, [/streak/i]) ||
    anyFileContains(files, [/consecutive/i, /day/i]) ||
    anyFileContains(files, [/login/i, /streak/i]);

  const hasReturnIncentives =
    anyFileContains(files, [/return/i, /bonus/i]) ||
    anyFileContains(files, [/come\s*back/i]) ||
    anyFileContains(files, [/re[- ]?engage/i]) ||
    anyFileContains(files, [/incentive/i]);

  const hasTimedEvents =
    anyFileContains(files, [/cron/i]) ||
    anyFileContains(files, [/schedule/i, /job/i]) ||
    anyFileContains(files, [/setInterval\(/i]) ||
    anyFileContains(files, [/setTimeout\(/i, /bonus|streak|retention/i]);

  const hasReferralToSignup =
    anyFileContains(files, [/referral/i, /signup/i]) ||
    anyFileContains(files, [/attribution/i, /signup/i]);

  const hasSignupToAction =
    anyFileContains(files, [/signup/i, /action/i]) ||
    anyFileContains(files, [/activation/i]) ||
    anyFileContains(files, [/first/i, /purchase|order|claim|event/i]);

  const hasRewardEligibilityTrace =
    anyFileContains(files, [/eligib/i, /reward/i]) ||
    anyFileContains(files, [/trace/i, /reward/i]) ||
    anyFileContains(files, [/proof/i, /attribution/i]) ||
    anyFileContains(files, [/audit/i, /referral/i]) ||
    anyFileContains(files, [/immutable/i, /referral|reward/i]);

  return {
    pillar: "pillar4",
    affiliate: {
      codeGenerationExists: hasReferralCodeGen,
      attributionOnSignupExists: hasAttributionOnSignup,
      inviterBindingExists: hasInviterBinding,
      rewardEventsExist: hasRewardEvents,
      fraudPreventionExists: hasFraudPrevention,
    },
    viralSharing: {
      sharePayloadExists: hasSharePayload,
      deepLinkRoutingExists: hasDeepLinkRouting,
      osShareIntegrationExists: hasOSShareIntegration,
    },
    retention: {
      streakLogicExists: hasStreakLogic,
      returnIncentivesExist: hasReturnIncentives,
      timedEventsExist: hasTimedEvents,
    },
    attribution: {
      referralToSignupTracked: hasReferralToSignup,
      signupToActionTracked: hasSignupToAction,
      rewardEligibilityTraceable: hasRewardEligibilityTrace,
    },
  };
}
