import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCreditsLedger1768109000000 implements MigrationInterface {
  name = "CreateCreditsLedger1768109000000";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    // === ensure table public.credits_account ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."credits_account" (
  "id" int DEFAULT nextval('credits_account_id_seq'::regclass) NOT NULL,
  "userId" int NOT NULL,
  "balanceCents" int DEFAULT 0 NOT NULL,
  "heldCents" int DEFAULT 0 NOT NULL,
  "lifetimeEarnedCents" int DEFAULT 0 NOT NULL,
  "lifetimeSpentCents" int DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "credits_account_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: IDX_credits_account_userId_unique
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_credits_account_userId_unique" ON public.credits_account USING btree ("userId")`);

    // index: PK_credits_account_id
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "PK_credits_account_id" ON public.credits_account USING btree (id)`);

    // === ensure table public.credits_ledger_entry ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."credits_ledger_entry" (
  "id" int DEFAULT nextval('credits_ledger_entry_id_seq'::regclass) NOT NULL,
  "accountId" int NOT NULL,
  "userId" int NOT NULL,
  "type" text NOT NULL,
  "amountCents" int NOT NULL,
  "relatedUserId" int,
  "refType" text,
  "refId" int,
  "metadata" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "credits_ledger_entry_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: IDX_credits_ledger_accountId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credits_ledger_accountId" ON public.credits_ledger_entry USING btree ("accountId")`);

    // index: IDX_credits_ledger_refType_refId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credits_ledger_refType_refId" ON public.credits_ledger_entry USING btree ("refType", "refId")`);

    // index: IDX_credits_ledger_userId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credits_ledger_userId" ON public.credits_ledger_entry USING btree ("userId")`);

    // index: PK_credits_ledger_entry_id
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "PK_credits_ledger_entry_id" ON public.credits_ledger_entry USING btree (id)`);

    // === ensure table public.credits_transfer ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."credits_transfer" (
  "id" int DEFAULT nextval('credits_transfer_id_seq'::regclass) NOT NULL,
  "fromUserId" int,
  "toUserId" int NOT NULL,
  "amountCents" int NOT NULL,
  "fundedCents" int DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'REQUESTED'::text NOT NULL,
  "message" text,
  "expiresAt" timestamp,
  "metadata" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "credits_transfer_pkey" PRIMARY KEY ("id")
      );
    `);

    // index: IDX_credits_transfer_fromUserId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credits_transfer_fromUserId" ON public.credits_transfer USING btree ("fromUserId")`);

    // index: IDX_credits_transfer_status
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credits_transfer_status" ON public.credits_transfer USING btree (status)`);

    // index: IDX_credits_transfer_toUserId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credits_transfer_toUserId" ON public.credits_transfer USING btree ("toUserId")`);

    // index: PK_credits_transfer_id
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "PK_credits_transfer_id" ON public.credits_transfer USING btree (id)`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op (prod truth restore). Do NOT drop prod tables.
    return;
  }
}
