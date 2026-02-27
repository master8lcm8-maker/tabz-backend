import { MigrationInterface, QueryRunner } from "typeorm";

export class ProdWalletsBaseline1768891965353 implements MigrationInterface {
  name = "ProdWalletsBaseline1768891965353";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    // === ensure table public.wallets ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."wallets" (
  "id" bigint DEFAULT nextval('wallets_id_seq'::regclass) NOT NULL,
  "userId" int NOT NULL,
  "balanceCents" bigint DEFAULT 0 NOT NULL,
  "spendableBalanceCents" bigint DEFAULT 0 NOT NULL,
  "cashoutAvailableCents" bigint DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: IDX_wallets_userId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallets_userId" ON public.wallets USING btree ("userId")`);

    // index: wallets_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS wallets_pkey ON public.wallets USING btree (id)`);

    // === ensure table public.wallet_transactions ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."wallet_transactions" (
  "id" bigint DEFAULT nextval('wallet_transactions_id_seq'::regclass) NOT NULL,
  "walletId" int,
  "type" varchar(64) NOT NULL,
  "amountCents" bigint NOT NULL,
  "metadata" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: wallet_transactions_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_pkey ON public.wallet_transactions USING btree (id)`);

    // === ensure table public.venue_wallets ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."venue_wallets" (
  "id" bigint DEFAULT nextval('venue_wallets_id_seq'::regclass) NOT NULL,
  "venueId" int NOT NULL,
  "balanceCents" bigint DEFAULT 0 NOT NULL,
  "cashoutAvailableCents" bigint DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "venue_wallets_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: venue_wallets_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS venue_wallets_pkey ON public.venue_wallets USING btree (id)`);

    // === ensure table public.venue_wallet_transactions ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."venue_wallet_transactions" (
  "id" bigint DEFAULT nextval('venue_wallet_transactions_id_seq'::regclass) NOT NULL,
  "venueWalletId" int NOT NULL,
  "type" varchar(64) NOT NULL,
  "amountCents" bigint NOT NULL,
  "metadata" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "venue_wallet_transactions_pkey" PRIMARY KEY ("id")
      );
    `);

    // fk: FK_venue_wallet_transactions_venueWalletId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_venue_wallet_transactions_venueWalletId'
        ) THEN
          ALTER TABLE public."venue_wallet_transactions"
            ADD CONSTRAINT "FK_venue_wallet_transactions_venueWalletId"
            FOREIGN KEY ("venueWalletId")
            REFERENCES "public"."venue_wallets" ("id");
        END IF;
      END $$;
    `);

    // index: IDX_venue_wallet_transactions_venueWalletId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_venue_wallet_transactions_venueWalletId" ON public.venue_wallet_transactions USING btree ("venueWalletId")`);

    // index: venue_wallet_transactions_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS venue_wallet_transactions_pkey ON public.venue_wallet_transactions USING btree (id)`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op (prod truth restore). Do NOT drop prod tables.
    return;
  }
}
