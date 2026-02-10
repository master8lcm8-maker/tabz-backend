/**
 * PILLAR 4 — OS Share Integration Stub (Slice A / Add-only)
 * Goal: represent OS share sheet integration points (RN + Web).
 * No imports into src/** until AUTHORIZED TO WIRE.
 */
import { Share } from "react-native";

export class OsShareIntegrationStub {
  async shareInvite(message: string, url: string) {
    // RN share sheet
    return Share.share({ message, url });
  }

  async webShare(title: string, text: string, url: string) {
    // Web Share API (best-effort)
    const nav: any = (globalThis as any).navigator;
    return nav?.share?.({ title, text, url });
  }
}
