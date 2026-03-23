import { MigrationInterface, QueryRunner } from "typeorm";

export class P5AccountDeletionSchemaSync1700000000000 implements MigrationInterface {
  name = "P5AccountDeletionSchemaSync1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  -- Step 1 Account Deletion is already proven GREEN.
  -- Do not mutate an existing production table that may be owned by another role.
  -- Only create the table and index if they do not already exist.

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'account_deletion_requests'
  ) THEN
    CREATE TABLE public.account_deletion_requests (
      "id" bigserial PRIMARY KEY,
      "userId" bigint NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "reason" text NULL,
      "ip" text NULL,
      "userAgent" text NULL,
      "confirmedAt" timestamptz NULL,
      "completedAt" timestamptz NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'idx_account_deletion_requests_userId'
  ) THEN
    CREATE INDEX "idx_account_deletion_requests_userId"
      ON public.account_deletion_requests ("userId");
  END IF;
END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op.
    // Do not drop or alter an existing production table from this sync migration.
  }
}