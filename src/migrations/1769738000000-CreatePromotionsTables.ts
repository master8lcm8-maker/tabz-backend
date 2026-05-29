import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePromotionsTables1769738000000 implements MigrationInterface {
  name = "CreatePromotionsTables1769738000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='promotions'
  ) THEN
    CREATE TABLE public.promotions (
      "id" SERIAL NOT NULL,
      "ownerUserId" integer NOT NULL,
      "targetType" text NOT NULL,
      "targetId" integer NULL,
      "title" text NOT NULL,
      "description" text NULL,
      "status" text NOT NULL DEFAULT 'draft',
      "listedPriceCents" integer NOT NULL DEFAULT 0,
      "platformFeePercent" integer NOT NULL DEFAULT 10,
      "platformFeeCents" integer NOT NULL DEFAULT 0,
      "merchantReceivableCents" integer NOT NULL DEFAULT 0,
      "budgetCents" integer NOT NULL DEFAULT 0,
      "spentCents" integer NOT NULL DEFAULT 0,
      "startsAt" TIMESTAMP NULL,
      "endsAt" TIMESTAMP NULL,
      "approvedAt" TIMESTAMP NULL,
      "rejectedAt" TIMESTAMP NULL,
      "rejectionReason" text NULL,
      "metadata" jsonb NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_promotions_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_promotions_ownerUserId'
  ) THEN
    CREATE INDEX "IDX_promotions_ownerUserId" ON public.promotions ("ownerUserId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_promotions_status'
  ) THEN
    CREATE INDEX "IDX_promotions_status" ON public.promotions ("status");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_promotions_targetType_targetId'
  ) THEN
    CREATE INDEX "IDX_promotions_targetType_targetId" ON public.promotions ("targetType", "targetId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='promotion_billing_events'
  ) THEN
    CREATE TABLE public.promotion_billing_events (
      "id" SERIAL NOT NULL,
      "promotionId" integer NOT NULL,
      "eventType" text NOT NULL,
      "amountCents" integer NOT NULL,
      "platformFeeCents" integer NOT NULL DEFAULT 0,
      "merchantReceivableCents" integer NOT NULL DEFAULT 0,
      "idempotencyKey" text NULL,
      "metadata" jsonb NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_promotion_billing_events_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_promotion_billing_events_promotionId'
  ) THEN
    CREATE INDEX "IDX_promotion_billing_events_promotionId" ON public.promotion_billing_events ("promotionId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='UQ_promotion_billing_events_idempotency_key'
  ) THEN
    CREATE UNIQUE INDEX "UQ_promotion_billing_events_idempotency_key"
      ON public.promotion_billing_events ("idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='promotion_revenue_events'
  ) THEN
    CREATE TABLE public.promotion_revenue_events (
      "id" SERIAL NOT NULL,
      "promotionId" integer NOT NULL,
      "sourceType" text NOT NULL,
      "sourceId" integer NULL,
      "grossCents" integer NOT NULL,
      "platformFeeCents" integer NOT NULL DEFAULT 0,
      "merchantReceivableCents" integer NOT NULL DEFAULT 0,
      "idempotencyKey" text NULL,
      "metadata" jsonb NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_promotion_revenue_events_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_promotion_revenue_events_promotionId'
  ) THEN
    CREATE INDEX "IDX_promotion_revenue_events_promotionId" ON public.promotion_revenue_events ("promotionId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='UQ_promotion_revenue_events_idempotency_key'
  ) THEN
    CREATE UNIQUE INDEX "UQ_promotion_revenue_events_idempotency_key"
      ON public.promotion_revenue_events ("idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL;
  END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='promotion_revenue_events'
  ) THEN
    DROP TABLE public.promotion_revenue_events;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='promotion_billing_events'
  ) THEN
    DROP TABLE public.promotion_billing_events;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='promotions'
  ) THEN
    DROP TABLE public.promotions;
  END IF;
END $$;
`);
  }
}
