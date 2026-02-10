export interface ReleaseManifestInput {
  semver: string;
  buildNumber: number;
  gitTag: string;
}

export interface ReleaseManifestResult {
  ok: boolean;
  reason: string;
  manifest?: {
    semver: string;
    buildNumber: number;
    gitTag: string;
    builtAt: string;
  };
}

export function buildReleaseManifest(input: ReleaseManifestInput): ReleaseManifestResult {
  if (!input.semver || !input.gitTag || !input.buildNumber) {
    return { ok: false, reason: "MISSING_FIELDS" };
  }
  return {
    ok: true,
    reason: "SLICE_B_MANIFEST_OK",
    manifest: {
      semver: input.semver,
      buildNumber: input.buildNumber,
      gitTag: input.gitTag,
      builtAt: new Date().toISOString(),
    },
  };
}
