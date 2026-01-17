import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCreditsLedger1768109000000 implements MigrationInterface {
  name = "CreateCreditsLedger1768109000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  -- credits_account
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='credits_account'
  ) THEN
    CREATE TABLE "credits_account" (
      "id" SERIAL NOT NULL,
      "userId" integer NOT NULL,
      "balanceCents" integer NOT NULL DEFAULT 0,
      "heldCents" integer NOT NULL DEFAULT 0,
      "lifetimeEarnedCents" integer NOT NULL DEFAULT 0,
      "lifetimeSpentCents" integer NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_credits_account_id" PRIMARY KEY ("id")
    );
  END IF;

  -- unique userId
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_account_userId_unique'
  ) THEN
    CREATE UNIQUE INDEX "IDX_credits_account_userId_unique" ON "credits_account" ("userId");
  END IF;

  -- credits_ledger_entry
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='credits_ledger_entry'
  ) THEN
    CREATE TABLE "credits_ledger_entry" (
      "id" SERIAL NOT NULL,
      "accountId" integer NOT NULL,
      "userId" integer NOT NULL,
      "type" text NOT NULL,
      "amountCents" integer NOT NULL,
      "relatedUserId" integer,
      "refType" text,
      "refId" integer,
      "metadata" text,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_credits_ledger_entry_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_ledger_refType_refId'
  ) THEN
    CREATE INDEX "IDX_credits_ledger_refType_refId" ON "credits_ledger_entry" ("refType","refId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_ledger_userId'
  ) THEN
    CREATE INDEX "IDX_credits_ledger_userId" ON "credits_ledger_entry" ("userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_ledger_accountId'
  ) THEN
    CREATE INDEX "IDX_credits_ledger_accountId" ON "credits_ledger_entry" ("accountId");
  END IF;

  -- credits_transfer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='credits_transfer'
  ) THEN
    CREATE TABLE "credits_transfer" (
      "id" SERIAL NOT NULL,
      "fromUserId" integer,
      "toUserId" integer NOT NULL,
      "amountCents" integer NOT NULL,
      "fundedCents" integer NOT NULL DEFAULT 0,
      "status" text NOT NULL DEFAULT 'REQUESTED',
      "message" text,
      "expiresAt" TIMESTAMP,
      "metadata" text,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_credits_transfer_id" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_transfer_status'
  ) THEN
    CREATE INDEX "IDX_credits_transfer_status" ON "credits_transfer" ("status");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_transfer_fromUserId'
  ) THEN
    CREATE INDEX "IDX_credits_transfer_fromUserId" ON "credits_transfer" ("fromUserId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='IDX_credits_transfer_toUserId'
  ) THEN
    CREATE INDEX "IDX_credits_transfer_toUserId" ON "credits_transfer" ("toUserId");
  END IF;

END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credits_transfer') THEN
    DROP TABLE "credits_transfer";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credits_ledger_entry') THEN
    DROP TABLE "credits_ledger_entry";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credits_account') THEN
    DROP TABLE "credits_account";
  END IF;
END $$;
`);
  }
}
