import { P5VersionManifest } from "../contracts/pillar5.contracts";

export function buildVersionManifest(semver: string, buildNumber: number, gitTag: string): P5VersionManifest {
  return { semver, buildNumber, gitTag, createdAt: new Date().toISOString() };
}
