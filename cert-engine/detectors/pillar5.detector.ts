import * as fs from "fs";
import * as path from "path";

type Pillar5Evidence = {
  pillar: "pillar5";

  appStoreCompliance: {
    privacyPolicyExists: boolean;
    termsOfServiceExists: boolean;
    accountDeletionExists: boolean;
    supportContactExists: boolean;
    reviewerDemoCredentialsExist: boolean;
  };

  releasePipeline: {
    iosSigningConfigured: boolean;
    androidSigningConfigured: boolean;
    versioningDisciplineExists: boolean;
    buildReproducibilityExists: boolean;
  };

  observability: {
    crashReportingExists: boolean;
    errorLoggingExists: boolean;
    productionDiagnosticsExist: boolean;
  };

  operationalSafety: {
    rollbackProcedureExists: boolean;
    tagDisciplineExists: boolean;
    hotfixProtocolExists: boolean;
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
 * Pillar 5 detector:
 * ONLY scans evidence/pillar5 to prevent false greens from unrelated repo code.
 */
export function detectPillar5(repoRoot: string): Pillar5Evidence {
  const evidenceRoot = path.join(repoRoot, "evidence", "pillar5");
  const files = walkFiles(evidenceRoot);

  const hasPrivacy =
    anyFileContains(files, [/privacy\s*policy/i]) ||
    anyFileContains(files, [/privacy/i, /policy/i]) ||
    anyFileContains(files, [/gdpr/i]) ||
    anyFileContains(files, [/data/i, /deletion/i]);

  const hasTerms =
    anyFileContains(files, [/terms\s*of\s*service/i]) ||
    anyFileContains(files, [/\bterms\b/i, /\bservice\b/i]) ||
    anyFileContains(files, [/tos/i]);

  const hasAccountDeletion =
    anyFileContains(files, [/account/i, /delete/i]) ||
    anyFileContains(files, [/deleteAccount/i]) ||
    anyFileContains(files, [/delete\s*my\s*data/i]);

  const hasSupportContact =
    anyFileContains(files, [/support@/i]) ||
    anyFileContains(files, [/contact/i, /support/i]) ||
    anyFileContains(files, [/help/i, /support/i]);

  const hasReviewerCreds =
    anyFileContains(files, [/reviewer/i, /demo/i, /cred/i]) ||
    anyFileContains(files, [/demo/i, /credentials/i]) ||
    anyFileContains(files, [/review/i, /notes/i]);

  const hasIosSigning =
    anyFileContains(files, [/ios/i, /sign/i]) ||
    anyFileContains(files, [/provision/i, /profile/i]) ||
    anyFileContains(files, [/certificate/i, /ios/i]) ||
    anyFileContains(files, [/xcode/i, /signing/i]);

  const hasAndroidSigning =
    anyFileContains(files, [/android/i, /keystore/i]) ||
    anyFileContains(files, [/signingConfig/i]) ||
    anyFileContains(files, [/upload\s*key/i]) ||
    anyFileContains(files, [/gradle/i, /sign/i]);

  const hasVersionDiscipline =
    anyFileContains(files, [/versionCode/i]) ||
    anyFileContains(files, [/versionName/i]) ||
    anyFileContains(files, [/cfbundleshortversionstring/i]) ||
    anyFileContains(files, [/semantic/i, /version/i]);

  const hasBuildRepro =
    anyFileContains(files, [/lockfile/i]) ||
    anyFileContains(files, [/package-lock\.json/i]) ||
    anyFileContains(files, [/pnpm-lock\.yaml/i]) ||
    anyFileContains(files, [/yarn\.lock/i]) ||
    anyFileContains(files, [/ci/i, /build/i]) ||
    anyFileContains(files, [/deterministic/i]) ||
    anyFileContains(files, [/reproduc/i]);

  const hasCrashReporting =
    anyFileContains(files, [/sentry/i]) ||
    anyFileContains(files, [/crash/i, /report/i]) ||
    anyFileContains(files, [/crashlytics/i]);

  const hasErrorLogging =
    anyFileContains(files, [/winston/i]) ||
    anyFileContains(files, [/pino/i]) ||
    anyFileContains(files, [/logger/i, /error/i]) ||
    anyFileContains(files, [/error/i, /telemetry/i]);

  const hasProdDiagnostics =
    anyFileContains(files, [/health/i, /endpoint/i]) ||
    anyFileContains(files, [/metrics/i]) ||
    anyFileContains(files, [/opentelemetry/i]) ||
    anyFileContains(files, [/trace/i]) ||
    anyFileContains(files, [/diagnostic/i]);

  const hasRollback =
    anyFileContains(files, [/rollback/i]) ||
    anyFileContains(files, [/revert/i]) ||
    anyFileContains(files, [/restore/i, /deploy/i]);

  const hasTagDiscipline =
    anyFileContains(files, [/LOCK-/i]) ||
    anyFileContains(files, [/tag/i, /immutable/i]) ||
    anyFileContains(files, [/ruleset/i, /LOCK/i]);

  const hasHotfixProtocol =
    anyFileContains(files, [/hotfix/i]) ||
    anyFileContains(files, [/incident/i, /process/i]) ||
    anyFileContains(files, [/patch/i, /release/i]);

  return {
    pillar: "pillar5",
    appStoreCompliance: {
      privacyPolicyExists: hasPrivacy,
      termsOfServiceExists: hasTerms,
      accountDeletionExists: hasAccountDeletion,
      supportContactExists: hasSupportContact,
      reviewerDemoCredentialsExist: hasReviewerCreds,
    },
    releasePipeline: {
      iosSigningConfigured: hasIosSigning,
      androidSigningConfigured: hasAndroidSigning,
      versioningDisciplineExists: hasVersionDiscipline,
      buildReproducibilityExists: hasBuildRepro,
    },
    observability: {
      crashReportingExists: hasCrashReporting,
      errorLoggingExists: hasErrorLogging,
      productionDiagnosticsExist: hasProdDiagnostics,
    },
    operationalSafety: {
      rollbackProcedureExists: hasRollback,
      tagDisciplineExists: hasTagDiscipline,
      hotfixProtocolExists: hasHotfixProtocol,
    },
  };
}
