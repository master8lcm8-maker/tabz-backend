export interface ReleaseManifest {
  semver: string;              // x.y.z
  buildNumber: number;         // iOS CFBundleVersion / Android versionCode
  gitTag: string;              // immutable tag for the build
  builtAt: string;             // ISO timestamp
  artifacts: {
    iosIpaSha256?: string;
    androidAabSha256?: string;
  };
}
