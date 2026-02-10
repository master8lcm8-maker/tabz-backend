/**
 * PILLAR 5 — Build Reproducibility Contracts (Slice A / Add-only)
 * Hash manifest + artifact recording shapes.
 */
export type BuildArtifact = {
  platform: "ios" | "android" | "web" | string;
  version: string;      // semver
  buildNumber: number;  // versionCode / CFBundleVersion
  gitTag?: string;
  createdAt: string;
  artifactPath?: string;
  sha256?: string;
};

export type BuildManifest = {
  project: "TABZ";
  env: "dev" | "staging" | "prod" | string;
  lockfile: "package-lock.json" | "pnpm-lock.yaml" | "yarn.lock" | string;
  artifacts: BuildArtifact[];
};
