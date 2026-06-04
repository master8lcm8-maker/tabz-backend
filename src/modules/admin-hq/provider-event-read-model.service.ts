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

    const recorded = rows?.[0] ?? null;

    const lifecycleBridge = await this.recordProviderPaymentReconciliationLedgerBridge({
      eventType,
      providerStatus,
      sourceType,
      sourceId,
      stripeEventId,
      payload,
    });

    return recorded ? { ...recorded, lifecycleBridge } : { lifecycleBridge };
  }

  // ADMIN_HQ_MONEY_SYSTEM_10AU_PROVIDER_PAYMENT_RECON_LEDGER_BRIDGE
  // Zero-amount read-model bridge only. This does not move money, does not credit a wallet,
  // does not create a provider transfer, and does not fake a payout. It records that a
  // signed provider payment event is reconciled to a real TABZ order so Admin HQ can
  // distinguish DB-backed lifecycle truth from missing wallet/venue transaction bridges.
  private async recordProviderPaymentReconciliationLedgerBridge(input: {
    eventType: string;
    providerStatus: string | null;
    sourceType: string | null;
    sourceId: number | null;
    stripeEventId: string | null;
    payload: Record<string, unknown> | null;
  }) {
    if (input.eventType !== 'payment_intent.succeeded') {
      return { skipped: true, reason: 'not_payment_intent_succeeded' };
    }

    if (input.providerStatus !== 'succeeded') {
      return { skipped: true, reason: 'provider_status_not_succeeded' };
    }

    if (input.sourceType !== 'payment_intent') {
      return { skipped: true, reason: 'source_type_not_payment_intent' };
    }

    if (!input.sourceId || !Number.isFinite(input.sourceId)) {
      return { skipped: true, reason: 'missing_real_order_source_id' };
    }

    const orderRows = await this.dataSource.query(
      `
      SELECT
        "id",
        "buyerId",
        "venueId",
        "priceCents",
        "status",
        "walletReservationId"
      FROM public."drink_orders"
      WHERE "id" = $1
      LIMIT 1;
      `,
      [input.sourceId],
    );

    const order = orderRows?.[0] ?? null;

    if (!order) {
      return { skipped: true, reason: 'real_order_not_found', sourceId: input.sourceId };
    }

    if (String(order.status || '').toUpperCase() !== 'PAID') {
      return {
        skipped: true,
        reason: 'order_not_paid',
        sourceId: input.sourceId,
        orderStatus: order.status,
      };
    }

    const walletRows = await this.dataSource.query(
      `
      SELECT "id", "userId"
      FROM public."wallets"
      WHERE "userId" = $1
      ORDER BY "id" ASC
      LIMIT 1;
      `,
      [order.buyerId],
    );

    const wallet = walletRows?.[0] ?? null;

    if (!wallet) {
      return { skipped: true, reason: 'buyer_wallet_not_found', buyerId: order.buyerId };
    }

    const metadata = JSON.stringify({
      bridge: 'provider_payment_reconciliation',
      valueClass: 'zero_amount_no_money_movement',
      noCustody: true,
      stripeEventId: input.stripeEventId,
      providerStatus: input.providerStatus,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      orderKind: 'drink',
      orderId: order.id,
      buyerId: order.buyerId,
      venueId: order.venueId,
      orderStatus: order.status,
      priceCents: order.priceCents,
      walletReservationId: order.walletReservationId ?? null,
      createdBy: 'ADMIN_HQ_MONEY_SYSTEM_10AU',
    });

    const existingRows = await this.dataSource.query(
      `
      SELECT "id", "refType", "refId", "metadata"
      FROM public."credits_ledger_entry"
      WHERE "refType" = 'PROVIDER_PAYMENT_RECON'
        AND "refId" = $1
        AND "metadata" ILIKE '%' || $2 || '%'
      ORDER BY "id" DESC
      LIMIT 1;
      `,
      [input.sourceId, input.stripeEventId || 'missing_stripe_event_id'],
    );

    const existing = existingRows?.[0] ?? null;

    if (existing) {
      return {
        created: false,
        idempotent: true,
        ledgerEntryId: existing.id,
        refType: existing.refType,
        refId: existing.refId,
      };
    }

    const insertedRows = await this.dataSource.query(
      `
      INSERT INTO public."credits_ledger_entry" (
        "accountId",
        "userId",
        "type",
        "amountCents",
        "relatedUserId",
        "refType",
        "refId",
        "metadata",
        "createdAt",
        "creditType"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9)
      RETURNING "id","accountId","userId","type","amountCents","refType","refId","metadata","creditType","createdAt";
      `,
      [
        Number(wallet.id),
        Number(order.buyerId),
        'PROVIDER_PAYMENT_RECON',
        0,
        null,
        'PROVIDER_PAYMENT_RECON',
        Number(order.id),
        metadata,
        'cash_backed',
      ],
    );

    const inserted = insertedRows?.[0] ?? null;

    return {
      created: true,
      idempotent: false,
      ledgerEntryId: inserted?.id ?? null,
      refType: inserted?.refType ?? 'PROVIDER_PAYMENT_RECON',
      refId: inserted?.refId ?? input.sourceId,
      amountCents: 0,
      noMoneyMovement: true,
    };
  }
}