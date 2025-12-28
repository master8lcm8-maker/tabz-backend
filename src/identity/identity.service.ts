import { Injectable } from "@nestjs/common";
import Stripe from "stripe";

export type VerifyStatus = "required" | "started" | "pending" | "verified" | "failed";

@Injectable()
export class IdentityService {
  // In-memory dev store (will be replaced by DB + Stripe later)
  private readonly store = new Map<
    number,
    { status: VerifyStatus; updatedAt: string; sessionUrl?: string }
  >();

  // ✅ DEV: where to send user for the hosted flow (placeholder until real Stripe)
  private readonly DEV_SESSION_URL = "https://example.com";

  // ✅ NEW: Stripe is OPTIONAL. Only used if STRIPE_SECRET_KEY is set.
  private readonly STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
  private stripeClient: Stripe | null = null;

  private getStripe(): Stripe {
    if (this.stripeClient) return this.stripeClient;

    if (!this.STRIPE_SECRET_KEY) {
      // IMPORTANT: don’t crash the server at boot
      throw new Error("Missing STRIPE_SECRET_KEY in backend env");
    }

    this.stripeClient = new Stripe(this.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16" as any,
    });

    return this.stripeClient;
  }

  async start(userId: number) {
    if (!userId) {
      return { status: "required" as VerifyStatus, error: "Missing userId (auth)" };
    }

    const now = new Date().toISOString();

    const existing = this.store.get(userId);
    if (existing?.status === "verified") {
      return {
        userId,
        status: "verified" as VerifyStatus,
        updatedAt: existing.updatedAt,
        provider: "stripe_identity",
      };
    }

    // ✅ If already started/pending AND sessionUrl is real, keep it.
    // ❌ If it's the DEV placeholder, generate a real Stripe session URL (when configured).
    if (
      existing &&
      (existing.status === "started" || existing.status === "pending") &&
      existing.sessionUrl &&
      !String(existing.sessionUrl).includes("example.com")
    ) {
      return { userId, ...existing, provider: "stripe_identity" };
    }

    // ✅ If Stripe isn't configured, fallback to DEV URL (keeps your current dev behavior)
    if (!this.STRIPE_SECRET_KEY) {
      const sessionUrl = existing?.sessionUrl || this.DEV_SESSION_URL;
      this.store.set(userId, { status: "started", updatedAt: now, sessionUrl });

      return {
        userId,
        status: "started" as VerifyStatus,
        updatedAt: now,
        provider: "stripe_identity",
        sessionUrl,
      };
    }

    // ✅ Create real Stripe Identity hosted session (only when STRIPE_SECRET_KEY exists)
    const stripe = this.getStripe();
    const vs = await stripe.identity.verificationSessions.create({
      type: "document",
      return_url:
        process.env.IDENTITY_RETURN_URL ||
        "http://localhost:8081/owner-identity-verification",
      metadata: { userId: String(userId) },
    });

    const sessionUrl = String((vs as any).url || "").trim();
    if (!sessionUrl) {
      throw new Error("Stripe Identity did not return a hosted session url");
    }

    this.store.set(userId, { status: "started", updatedAt: now, sessionUrl });

    return {
      userId,
      status: "started" as VerifyStatus,
      updatedAt: now,
      provider: "stripe_identity",
      sessionUrl,
    };
  }

  async getStatus(userId: number) {
    if (!userId) {
      return { userId: null, status: "required" as VerifyStatus, error: "Missing userId (auth)" };
    }

    const existing = this.store.get(userId);
    if (!existing) {
      return {
        userId,
        status: "required" as VerifyStatus,
        updatedAt: new Date().toISOString(),
        provider: "stripe_identity",
      };
    }

    return { userId, ...existing, provider: "stripe_identity" };
  }

  // DEV helper
  setStatus(userId: number, status: VerifyStatus) {
    const prev = this.store.get(userId);
    this.store.set(userId, {
      status,
      updatedAt: new Date().toISOString(),
      // ✅ preserve sessionUrl if it exists
      sessionUrl: prev?.sessionUrl || this.DEV_SESSION_URL,
    });
  }

  // ✅ DEV helper: simulate provider completion (started/pending -> verified)
  completeDev(userId: number) {
    const prev = this.store.get(userId);
    const sessionUrl = prev?.sessionUrl || this.DEV_SESSION_URL;

    this.store.set(userId, {
      status: "verified",
      updatedAt: new Date().toISOString(),
      sessionUrl,
    });

    return { ok: true, userId, status: "verified" as VerifyStatus };
  }
}
