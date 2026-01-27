import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFailureReasonAndRetryOfCashoutIdToCashoutRequests3047
  implements MigrationInterface
{
  name = 'AddFailureReasonAndRetryOfCashoutIdToCashoutRequests3047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  -- 1) Add failureReason if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cashout_requests'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='failureReason'
  ) THEN
    ALTER TABLE public.cashout_requests
      ADD COLUMN "failureReason" text NULL;
  END IF;

  -- 2) Add retryOfCashoutId if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cashout_requests'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='retryOfCashoutId'
  ) THEN
    ALTER TABLE public.cashout_requests
      ADD COLUMN "retryOfCashoutId" bigint NULL;
  END IF;

  -- 3) If legacy lowercase dup columns exist, merge into canonical (only fills canonical when NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='walletid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='walletId'
  ) THEN
    UPDATE public.cashout_requests
    SET "walletId" = COALESCE("walletId", walletid)
    WHERE walletid IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='failurereason'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='failureReason'
  ) THEN
    UPDATE public.cashout_requests
    SET "failureReason" = COALESCE("failureReason", failurereason)
    WHERE failurereason IS NOT NULL;
  END IF;

  -- 4) Drop legacy lowercase dup columns if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='walletid'
  ) THEN
    ALTER TABLE public.cashout_requests
      DROP COLUMN walletid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='failurereason'
  ) THEN
    ALTER TABLE public.cashout_requests
      DROP COLUMN failurereason;
  END IF;

  -- 5) Optional self-reference FK for retryOfCashoutId (idempotent)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='retryOfCashoutId'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema='public'
        AND table_name='cashout_requests'
        AND constraint_name='cashout_requests_retryOfCashoutId_fkey'
    ) THEN
      ALTER TABLE public.cashout_requests
        ADD CONSTRAINT "cashout_requests_retryOfCashoutId_fkey"
        FOREIGN KEY ("retryOfCashoutId") REFERENCES public.cashout_requests("id")
        ON DELETE SET NULL;
    END IF;

    -- index for retryOfCashoutId (idempotent)
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname='idx_cashout_requests_retryOfCashoutId'
    ) THEN
      CREATE INDEX "idx_cashout_requests_retryOfCashoutId"
        ON public.cashout_requests ("retryOfCashoutId");
    END IF;
  END IF;
END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Keep down safe/idempotent; do NOT recreate legacy lowercase columns.
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public'
      AND table_name='cashout_requests'
      AND constraint_name='cashout_requests_retryOfCashoutId_fkey'
  ) THEN
    ALTER TABLE public.cashout_requests
      DROP CONSTRAINT "cashout_requests_retryOfCashoutId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_cashout_requests_retryOfCashoutId'
  ) THEN
    DROP INDEX public."idx_cashout_requests_retryOfCashoutId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='retryOfCashoutId'
  ) THEN
    ALTER TABLE public.cashout_requests
      DROP COLUMN "retryOfCashoutId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cashout_requests'
      AND column_name='failureReason'
  ) THEN
    ALTER TABLE public.cashout_requests
      DROP COLUMN "failureReason";
  END IF;
END $$;
    `);
  }
}
