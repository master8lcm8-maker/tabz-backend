import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBaseTables1700000000000 implements MigrationInterface {
  name = "CreateBaseTables1700000000000";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    // === ensure table public.users ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."users" (
  "id" bigint DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  "email" varchar(255) NOT NULL,
  "passwordHash" varchar(255),
  "role" varchar(32) DEFAULT 'buyer'::character varying NOT NULL,
  "venueId" bigint,
  "profileId" bigint,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "displayName" varchar(255),
  "isActive" boolean DEFAULT true NOT NULL,
  "deletedAt" timestamp,
  "anonymizedAt" timestamp,
  "deletionReason" text,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `);

    // unique: users_email_key
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'users_email_key'
        ) THEN
          ALTER TABLE public."users"
            ADD CONSTRAINT "users_email_key" UNIQUE ("email");
        END IF;
      END $$;
    `);

    // index: users_email_key
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users USING btree (email)`);

    // index: users_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON public.users USING btree (id)`);

    // === ensure table public.profiles ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."profiles" (
  "id" bigint DEFAULT nextval('profiles_id_seq'::regclass) NOT NULL,
  "userId" bigint NOT NULL,
  "type" varchar(32) NOT NULL,
  "displayName" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "bio" text,
  "avatarUrl" text,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "coverUrl" varchar(2048),
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
      );
    `);

    // unique: profiles_slug_key
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'profiles_slug_key'
        ) THEN
          ALTER TABLE public."profiles"
            ADD CONSTRAINT "profiles_slug_key" UNIQUE ("slug");
        END IF;
      END $$;
    `);

    // unique: profiles_userid_unique
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'profiles_userid_unique'
        ) THEN
          ALTER TABLE public."profiles"
            ADD CONSTRAINT "profiles_userid_unique" UNIQUE ("userId");
        END IF;
      END $$;
    `);

    // fk: profiles_userId_fkey
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'profiles_userId_fkey'
        ) THEN
          ALTER TABLE public."profiles"
            ADD CONSTRAINT "profiles_userId_fkey"
            FOREIGN KEY ("userId")
            REFERENCES "public"."users" ("id");
        END IF;
      END $$;
    `);

    // index: profiles_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_pkey ON public.profiles USING btree (id)`);

    // index: profiles_slug_key
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key ON public.profiles USING btree (slug)`);

    // index: profiles_userid_unique
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_userid_unique ON public.profiles USING btree ("userId")`);

    // === ensure table public.venues ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."venues" (
  "id" bigint DEFAULT nextval('venues_id_seq'::regclass) NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "country" varchar(64),
  "avatarUrl" text,
  "coverUrl" text,
  "ownerProfileId" bigint,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "ownerId" int,
  "address" varchar(255),
  "city" varchar(255),
  "state" varchar(255),
  CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
      );
    `);

    // unique: venues_slug_key
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'venues_slug_key'
        ) THEN
          ALTER TABLE public."venues"
            ADD CONSTRAINT "venues_slug_key" UNIQUE ("slug");
        END IF;
      END $$;
    `);

    // index: venues_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS venues_pkey ON public.venues USING btree (id)`);

    // index: venues_slug_key
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_key ON public.venues USING btree (slug)`);

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

    // === ensure table public.cashout_requests ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."cashout_requests" (
  "id" bigint DEFAULT nextval('cashout_requests_id_seq'::regclass) NOT NULL,
  "ownerProfileId" bigint,
  "amountCents" int DEFAULT 0 NOT NULL,
  "status" varchar(32) DEFAULT 'pending'::character varying NOT NULL,
  "destinationType" varchar(32),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "destinationLast4" varchar(4),
  "walletId" bigint,
  "failureReason" text,
  "retryOfCashoutId" bigint,
  CONSTRAINT "cashout_requests_pkey" PRIMARY KEY ("id")
      );
    `);

    // fk: cashout_requests_retryOfCashoutId_fkey
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'cashout_requests_retryOfCashoutId_fkey'
        ) THEN
          ALTER TABLE public."cashout_requests"
            ADD CONSTRAINT "cashout_requests_retryOfCashoutId_fkey"
            FOREIGN KEY ("retryOfCashoutId")
            REFERENCES "public"."cashout_requests" ("id");
        END IF;
      END $$;
    `);

    // fk: cashout_requests_walletId_fkey
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'cashout_requests_walletId_fkey'
        ) THEN
          ALTER TABLE public."cashout_requests"
            ADD CONSTRAINT "cashout_requests_walletId_fkey"
            FOREIGN KEY ("walletId")
            REFERENCES "public"."wallets" ("id");
        END IF;
      END $$;
    `);

    // index: cashout_requests_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS cashout_requests_pkey ON public.cashout_requests USING btree (id)`);

    // index: idx_cashout_requests_retryOfCashoutId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cashout_requests_retryOfCashoutId" ON public.cashout_requests USING btree ("retryOfCashoutId")`);

    // index: idx_cashout_requests_walletId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cashout_requests_walletId" ON public.cashout_requests USING btree ("walletId")`);

    // index: idx_cashout_requests_walletId_status
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cashout_requests_walletId_status" ON public.cashout_requests USING btree ("walletId", status)`);

    // === ensure table public.cashout_locks ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."cashout_locks" (
  "id" bigint DEFAULT nextval('cashout_locks_id_seq'::regclass) NOT NULL,
  "userId" int NOT NULL,
  "amountCents" bigint NOT NULL,
  "unlockAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cashout_locks_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: IDX_cashout_locks_userId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cashout_locks_userId" ON public.cashout_locks USING btree ("userId")`);

    // index: cashout_locks_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS cashout_locks_pkey ON public.cashout_locks USING btree (id)`);

    // === ensure table public.bank_info ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."bank_info" (
  "id" bigint DEFAULT nextval('bank_info_id_seq'::regclass) NOT NULL,
  "userId" int NOT NULL,
  "bankNameEnc" varchar(255) NOT NULL,
  "accountHolderNameEnc" varchar(255) NOT NULL,
  "routingNumberEnc" varchar(255) NOT NULL,
  "accountNumberEnc" varchar(255) NOT NULL,
  "accountLast4" varchar(4) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "bank_info_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: bank_info_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS bank_info_pkey ON public.bank_info USING btree (id)`);

    // === ensure table public.payouts ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."payouts" (
  "id" bigint DEFAULT nextval('payouts_id_seq'::regclass) NOT NULL,
  "walletId" int NOT NULL,
  "amountCents" bigint NOT NULL,
  "status" varchar(20) NOT NULL,
  "failureReason" varchar(255),
  "destinationLast4" varchar(4),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: payouts_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS payouts_pkey ON public.payouts USING btree (id)`);

    // === ensure table public.transfers ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."transfers" (
  "id" bigint DEFAULT nextval('transfers_id_seq'::regclass) NOT NULL,
  "amountCents" bigint NOT NULL,
  "feeCents" bigint DEFAULT 0 NOT NULL,
  "unlockedForCashout" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "senderWalletId" int,
  "receiverWalletId" int,
  CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: transfers_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS transfers_pkey ON public.transfers USING btree (id)`);

    // === ensure table public.store_items ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."store_items" (
  "id" bigint DEFAULT nextval('store_items_id_seq'::regclass) NOT NULL,
  "name" varchar(255) NOT NULL,
  "amountCents" int NOT NULL,
  "venueId" int,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: store_items_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS store_items_pkey ON public.store_items USING btree (id)`);

    // === ensure table public.store_item_orders ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."store_item_orders" (
  "id" bigint DEFAULT nextval('store_item_orders_id_seq'::regclass) NOT NULL,
  "buyerId" int NOT NULL,
  "amountCents" int NOT NULL,
  "itemId" int NOT NULL,
  "quantity" int NOT NULL,
  "status" varchar(50) NOT NULL,
  "venueId" int,
  "itemSnapshot" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "store_item_orders_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: store_item_orders_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS store_item_orders_pkey ON public.store_item_orders USING btree (id)`);

    // === ensure table public.migrations ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."migrations" (
  "id" int DEFAULT nextval('migrations_id_seq'::regclass) NOT NULL,
  "timestamp" bigint NOT NULL,
  "name" varchar NOT NULL,
  CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: PK_8c82d7f526340ab734260ea46be
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "PK_8c82d7f526340ab734260ea46be" ON public.migrations USING btree (id)`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op (prod truth restore). Do NOT drop prod tables.
    return;
  }
}
