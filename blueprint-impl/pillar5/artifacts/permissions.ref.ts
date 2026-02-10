/**
 * PILLAR 5 — Permissions Reference (Slice A / Add-only)
 * Placeholder for permissions policy + justification notes.
 */
export const permissionsRef = {
  required: true,
  ios: [
    { key: "NSCameraUsageDescription", purpose: "Upload profile/venue media (if used)" },
    { key: "NSPhotoLibraryUsageDescription", purpose: "Select media for uploads" },
  ],
  android: [
    { key: "android.permission.INTERNET", purpose: "API requests" },
  ],
  notes: "Finalize actual permissions based on real features; do NOT request extras.",
};
