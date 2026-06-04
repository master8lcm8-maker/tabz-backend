import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ProviderEventSourceType =
  | 'payment_intent'
  | 'charge'
  | 'transfer'
  | 'payout'
  | 'refund'
  | 'dispute'
  | 'cashout'
  | 'order'
  | 'unknown';

export type ProviderEventWriteInput = {
  stripeEventId?: string | null;
  eventType: string;
  providerStatus?: string | null;
  sourceType?: ProviderEventSourceType | string | null;
  sourceId?: number | string | null;
  payload?: Record<string, unknown> | null;
  processedAt?: Date | string | null;
};

@Injectable()
export class ProviderEventReadModelService {
  constructor(private readonly dataSource: DataSource) {}

  async recordProviderEvent(input: ProviderEventWriteInput) {
    const eventType = String(input?.eventType || '').trim();

    if (!eventType) {
      throw new Error('provider_event_type_required');
    }

    const stripeEventId =
      input.stripeEventId === undefined || input.stripeEventId === null
        ? null
        : String(input.stripeEventId).trim() || null;

    const providerStatus =
      input.providerStatus === undefined || input.providerStatus === null
        ? null
        : String(input.providerStatus).trim() || null;

    const sourceType =
      input.sourceType === undefined || input.sourceType === null
        ? null
        : String(input.sourceType).trim() || null;

    const sourceId =
      input.sourceId === undefined || input.sourceId === null || input.sourceId === ''
        ? null
        : Number(input.sourceId);

    if (sourceId !== null && !Number.isFinite(sourceId)) {
      throw new Error('provider_event_source_id_invalid');
    }

    const processedAt =
      input.processedAt === undefined || input.processedAt === null || input.processedAt === ''
        ? null
        : new Date(input.processedAt);

    if (processedAt !== null && Number.isNaN(processedAt.getTime())) {
      throw new Error('provider_event_processed_at_invalid');
    }

    const payload = input.payload ?? null;

    const rows = await this.dataSource.query(
      `
      INSERT INTO public."stripe_events" (
        "stripeEventId",
        "eventType",
        "providerStatus",
        "sourceType",
        "sourceId",
        "payload",
        "processedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
      ON CONFLICT ("stripeEventId")
      WHERE "stripeEventId" IS NOT NULL
      DO UPDATE SET
        "eventType" = EXCLUDED."eventType",
        "providerStatus" = EXCLUDED."providerStatus",
        "sourceType" = EXCLUDED."sourceType",
        "sourceId" = EXCLUDED."sourceId",
        "payload" = EXCLUDED."payload",
        "processedAt" = EXCLUDED."processedAt",
        "updatedAt" = now()
      RETURNING
        "id",
        "stripeEventId",
        "eventType",
        "providerStatus",
        "sourceType",
        "sourceId",
        "processedAt",
        "createdAt",
        "updatedAt";
      `,
      [
        stripeEventId,
        eventType,
        providerStatus,
        sourceType,
        sourceId,
        payload === null ? null : JSON.stringify(payload),
        processedAt,
      ],
    );

    return rows?.[0] ?? null;
  }
}