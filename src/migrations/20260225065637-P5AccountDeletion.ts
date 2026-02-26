import { MigrationInterface, QueryRunner } from "typeorm";

export class P5AccountDeletion20260225065637 implements MigrationInterface {
  name = "P5AccountDeletion20260225065637";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const type = (queryRunner.connection.options as any)?.type;

    if (type === "postgres") {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz NULL`);
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "anonymizedAt" timestamptz NULL`);
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletionReason" text NULL`);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
          "id" SERIAL PRIMARY KEY,
          "userId" integer NOT NULL,
          "status" varchar(20) NOT NULL DEFAULT 'REQUESTED',
          "requestToken" varchar(120) NOT NULL,
          "requestedAt" timestamptz NOT NULL DEFAULT now(),
          "confirmedAt" timestamptz NULL,
          "ip" text NULL,
          "userAgent" text NULL
        )
      `);

      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UX_account_deletion_requests_requestToken"
         ON "account_deletion_requests" ("requestToken")`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IX_account_deletion_requests_userId"
         ON "account_deletion_requests" ("userId")`
      );
    } else {
      // SQLite fallback (dev only). Keep syntax portable.
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "deletedAt" datetime NULL`);
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "anonymizedAt" datetime NULL`);
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "deletionReason" text NULL`);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "userId" integer NOT NULL,
          "status" varchar(20) NOT NULL DEFAULT 'REQUESTED',
          "requestToken" varchar(120) NOT NULL,
          "requestedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "confirmedAt" datetime NULL,
          "ip" text NULL,
          "userAgent" text NULL
        )
      `);

      await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UX_account_deletion_requests_requestToken" ON "account_deletion_requests" ("requestToken")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IX_account_deletion_requests_userId" ON "account_deletion_requests" ("userId")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const type = (queryRunner.connection.options as any)?.type;

    if (type === "postgres") {
      await queryRunner.query(`DROP INDEX IF EXISTS "IX_account_deletion_requests_userId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "UX_account_deletion_requests_requestToken"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "account_deletion_requests"`);

      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deletionReason"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "anonymizedAt"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deletedAt"`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS "account_deletion_requests"`);
      // SQLite cannot DROP COLUMN easily; leave columns in place in down().
    }
  }
}