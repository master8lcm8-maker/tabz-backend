import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReferralTables1769820000000 implements MigrationInterface {
  name = "CreateReferralTables1769820000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='referral_links'
  ) THEN
    CREATE TABLE public.referral_links (
      "id" SERIAL NOT NULL,
      "ownerUserId" integer NOT NULL,
      "code" text NOT NULL,
      "status" text NOT NULL DEFAULT 'active',
      "targetType" text NULL,
      "targetId" integer NULL,
      "clicksCount" integer NOT NULL DEFAULT 0,
      "signupsCount" integer NOT NULL DEFAULT 0,
      "conversionsCount" integer NOT NULL DEFAULT 0,
      "rewardCents" integer NOT NULL DEFAULT 0,
      "metadata" jsonb NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_referral_links_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='UQ_referral_links_code'
  ) THEN
    CREATE UNIQUE INDEX "UQ_referral_links_code" ON public.referral_links ("code");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_referral_links_ownerUserId'
  ) THEN
    CREATE INDEX "IDX_referral_links_ownerUserId" ON public.referral_links ("ownerUserId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_referral_links_status'
  ) THEN
    CREATE INDEX "IDX_referral_links_status" ON public.referral_links ("status");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_referral_links_targetType_targetId'
  ) THEN
    CREATE INDEX "IDX_referral_links_targetType_targetId" ON public.referral_links ("targetType", "targetId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='referral_events'
  ) THEN
    CREATE TABLE public.referral_events (
      "id" SERIAL NOT NULL,
      "referralLinkId" integer NOT NULL,
      "eventType" text NOT NULL,
      "actorUserId" integer NULL,
      "ipHash" text NULL,
      "userAgentHash" text NULL,
      "sourceUrl" text NULL,
      "attributedUserId" integer NULL,
      "idempotencyKey" text NULL,
      "metadata" jsonb NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_referral_events_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_referral_events_referralLinkId'
  ) THEN
    CREATE INDEX "IDX_referral_events_referralLinkId" ON public.referral_events ("referralLinkId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_referral_events_eventType'
  ) THEN
    CREATE INDEX "IDX_referral_events_eventType" ON public.referral_events ("eventType");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_referral_events_attributedUserId'
  ) THEN
    CREATE INDEX "IDX_referral_events_attributedUserId" ON public.referral_events ("attributedUserId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='UQ_referral_events_idempotency_key'
  ) THEN
    CREATE UNIQUE INDEX "UQ_referral_events_idempotency_key"
      ON public.referral_events ("idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='FK_referral_events_referralLinkId'
  ) THEN
    ALTER TABLE public.referral_events
      ADD CONSTRAINT "FK_referral_events_referralLinkId"
      FOREIGN KEY ("referralLinkId") REFERENCES public.referral_links("id")
      ON DELETE CASCADE;
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
    WHERE table_schema='public' AND table_name='referral_events'
  ) THEN
    DROP TABLE public.referral_events;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='referral_links'
  ) THEN
    DROP TABLE public.referral_links;
  END IF;
END $$;
`);
  }
}