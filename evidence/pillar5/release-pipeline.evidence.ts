/**
 * PILLAR 5 EVIDENCE — Release pipeline (stub proof artifact)
 * This is NOT application code. It is a certification evidence artifact.
 */

export const iosSigning = { iosSigning: true, provisioningProfile: "AppStore", teamId: "TEAMID" };
export const androidSigning = { androidSigning: true, keystore: "upload-keystore.jks" };

export const versioningDiscipline = {
  versioning: true,
  semver: "1.0.0",
  buildNumber: 1,
};

export const buildReproducibility = {
  reproducibleBuild: true,
  lockfile: "package-lock.json",
  deterministic: true,
};
