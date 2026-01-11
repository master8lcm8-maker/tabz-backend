import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCreditsLedger3047 implements MigrationInterface {
  name = 'CreateCreditsLedger3047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // credits_account
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credits_account" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "userId" integer NOT NULL,
        "balanceCents" integer NOT NULL DEFAULT (0),
        "heldCents" integer NOT NULL DEFAULT (0),
        "lifetimeEarnedCents" integer NOT NULL DEFAULT (0),
        "lifetimeSpentCents" integer NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_credits_account_userId_unique"
      ON "credits_account" ("userId")
    `);

    // credits_ledger_entry
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credits_ledger_entry" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "accountId" integer NOT NULL,
        "userId" integer NOT NULL,
        "type" text NOT NULL,
        "amountCents" integer NOT NULL,
        "relatedUserId" integer,
        "refType" text,
        "refId" integer,
        "metadata" text,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credits_ledger_accountId"
      ON "credits_ledger_entry" ("accountId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credits_ledger_userId"
      ON "credits_ledger_entry" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credits_ledger_ref"
      ON "credits_ledger_entry" ("refType", "refId")
    `);

    // credits_transfer
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credits_transfer" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "fromUserId" integer,
        "toUserId" integer NOT NULL,
        "amountCents" integer NOT NULL,
        "status" text NOT NULL DEFAULT ('REQUESTED'),
        "message" text,
        "expiresAt" datetime,
        "metadata" text,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credits_transfer_toUserId"
      ON "credits_transfer" ("toUserId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credits_transfer_fromUserId"
      ON "credits_transfer" ("fromUserId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credits_transfer_status"
      ON "credits_transfer" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_transfer_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_transfer_fromUserId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_transfer_toUserId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credits_transfer"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_ledger_ref"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_ledger_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_ledger_accountId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credits_ledger_entry"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credits_account_userId_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credits_account"`);
  }
}
