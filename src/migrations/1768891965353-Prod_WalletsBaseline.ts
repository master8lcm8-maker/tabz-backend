import { MigrationInterface, QueryRunner } from "typeorm";

export class ProdWalletsBaseline1768891965353 implements MigrationInterface {
  name = "ProdWalletsBaseline1768891965353";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ADDITIVE-ONLY baseline for prod wallets subsystem.
    // DO NOT DROP OR ALTER EXISTING COLUMNS/TABLES HERE.

    // 1) venue_wallets (create if missing)
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='venue_wallets'
  ) THEN
    CREATE TABLE public.venue_wallets (
      id BIGSERIAL PRIMARY KEY,
      "venueId" INTEGER NOT NULL,
      "balanceCents" BIGINT NOT NULL DEFAULT 0,
      "cashoutAvailableCents" BIGINT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "UQ_venue_wallets_venueId"
      ON public.venue_wallets ("venueId");

    ALTER TABLE public.venue_wallets
      ADD CONSTRAINT "FK_venue_wallets_venueId"
      FOREIGN KEY ("venueId") REFERENCES public.venues(id)
      ON DELETE CASCADE;
  END IF;
END $$;
`);

    // 2) venue_wallet_transactions (ensure table + FK + index)
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='venue_wallet_transactions'
  ) THEN
    CREATE TABLE public.venue_wallet_transactions (
      id BIGSERIAL PRIMARY KEY,
      "venueWalletId" BIGINT NOT NULL,
      type VARCHAR(64) NOT NULL,
      "amountCents" BIGINT NOT NULL,
      metadata JSONB,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_venue_wallet_transactions_venueWalletId'
  ) THEN
    ALTER TABLE public.venue_wallet_transactions
      ADD CONSTRAINT "FK_venue_wallet_transactions_venueWalletId"
      FOREIGN KEY ("venueWalletId") REFERENCES public.venue_wallets(id)
      ON DELETE CASCADE;
  END IF;

  CREATE INDEX IF NOT EXISTS "IDX_venue_wallet_transactions_venueWalletId"
    ON public.venue_wallet_transactions ("venueWalletId");
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty (baseline).
  }
}


