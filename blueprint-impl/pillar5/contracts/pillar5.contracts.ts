export type ISODateString = string;

export type P5VersionManifest = {
  semver: string;
  buildNumber: number;
  gitTag: string;
  createdAt: ISODateString;
};

export type P5ErrorLog = {
  traceId: string;
  at: ISODateString;
  level: "error" | "warn" | "info";
  message: string;
  context?: Record<string, unknown>;
};
