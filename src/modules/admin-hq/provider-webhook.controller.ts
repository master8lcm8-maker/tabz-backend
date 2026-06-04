import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import Stripe from 'stripe';

import { ProviderEventReadModelService } from './provider-event-read-model.service';

type RawBodyRequest = {
  rawBody?: Buffer;
  body?: unknown;
};

@Controller('provider-webhooks')
export class ProviderWebhookController {
  constructor(private readonly providerEvents: ProviderEventReadModelService) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') stripeSignature: string | undefined,
  ) {
    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();

    if (!webhookSecret) {
      throw new BadRequestException('stripe_webhook_secret_missing');
    }

    if (!stripeSignature) {
      throw new BadRequestException('stripe_signature_missing');
    }

    if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException('stripe_raw_body_missing');
    }

    const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();

    if (!stripeSecret) {
      throw new BadRequestException('stripe_secret_key_missing');
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2023-10-16' as any,
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, stripeSignature, webhookSecret);
    } catch {
      throw new BadRequestException('stripe_signature_verification_failed');
    }

    const source = this.resolveSource(event);

    const recorded = await this.providerEvents.recordProviderEvent({
      stripeEventId: event.id,
      eventType: event.type,
      providerStatus: this.resolveProviderStatus(event),
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      payload: {
        id: event.id,
        type: event.type,
        livemode: event.livemode,
        created: event.created,
        api_version: event.api_version,
        request: event.request,
        object: event.data?.object ?? null,
      },
      processedAt: new Date(),
    });

    return {
      ok: true,
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      recordedId: recorded?.id ?? null,
    };
  }

  private resolveProviderStatus(event: Stripe.Event): string {
    const obj = event.data?.object as any;
    return String(obj?.status || event.type || 'received');
  }

  private resolveSource(event: Stripe.Event): { sourceType: string; sourceId: number | null } {
    const obj = event.data?.object as any;

    if (event.type.startsWith('payment_intent.')) {
      return { sourceType: 'payment_intent', sourceId: this.numericMetadataId(obj) };
    }

    if (event.type.startsWith('charge.')) {
      return { sourceType: 'charge', sourceId: this.numericMetadataId(obj) };
    }

    if (event.type.startsWith('transfer.')) {
      return { sourceType: 'transfer', sourceId: this.numericMetadataId(obj) };
    }

    if (event.type.startsWith('payout.')) {
      return { sourceType: 'payout', sourceId: this.numericMetadataId(obj) };
    }

    if (event.type.startsWith('refund.')) {
      return { sourceType: 'refund', sourceId: this.numericMetadataId(obj) };
    }

    if (event.type.startsWith('charge.dispute.')) {
      return { sourceType: 'dispute', sourceId: this.numericMetadataId(obj) };
    }

    return { sourceType: 'unknown', sourceId: this.numericMetadataId(obj) };
  }

  private numericMetadataId(obj: any): number | null {
    const raw =
      obj?.metadata?.cashoutRequestId ??
      obj?.metadata?.orderId ??
      obj?.metadata?.sourceId ??
      null;

    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
}