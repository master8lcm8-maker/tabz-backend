import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminControlTables1781000000000 implements MigrationInterface {
  name = 'CreateAdminControlTables1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refunds" (
        "id" BIGSERIAL PRIMARY KEY,
        "sourceType" varchar(64) NOT NULL DEFAULT 'manual',
        "sourceId" bigint NULL,
        "status" varchar(32) NOT NULL DEFAULT 'PENDING',
        "amountCents" bigint NULL,
        "currency" varchar(16) NOT NULL DEFAULT 'USD',
        "reason" text NULL,
        "adminNote" text NULL,
        "requestedByUserId" bigint NULL,
        "approvedByAdminUserId" bigint NULL,
        "approvedAt" TIMESTAMP NULL,
        "resolvedAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "disputes" (
        "id" BIGSERIAL PRIMARY KEY,
        "sourceType" varchar(64) NOT NULL DEFAULT 'manual',
        "sourceId" bigint NULL,
        "status" varchar(32) NOT NULL DEFAULT 'OPEN',
        "reason" text NULL,
        "resolution" text NULL,
        "openedByUserId" bigint NULL,
        "resolvedByAdminUserId" bigint NULL,
        "resolvedAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "final_resolutions" (
        "id" BIGSERIAL PRIMARY KEY,
        "sourceType" varchar(64) NOT NULL,
        "sourceId" bigint NULL,
        "status" varchar(64) NOT NULL DEFAULT 'ADMIN_REVIEW',
        "resolution" varchar(64) NOT NULL DEFAULT 'PENDING',
        "reason" text NULL,
        "adminNote" text NULL,
        "resolvedByAdminUserId" bigint NULL,
        "resolvedAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stripe_events" (
        "id" BIGSERIAL PRIMARY KEY,
        "stripeEventId" varchar(255) NULL,
        "eventType" varchar(255) NOT NULL,
        "providerStatus" varchar(64) NULL,
        "sourceType" varchar(64) NULL,
        "sourceId" bigint NULL,
        "payload" jsonb NULL,
        "processedAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refunds_status" ON "refunds" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refunds_source" ON "refunds" ("sourceType", "sourceId");`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_disputes_status" ON "disputes" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_disputes_source" ON "disputes" ("sourceType", "sourceId");`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_final_resolutions_status" ON "final_resolutions" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_final_resolutions_source" ON "final_resolutions" ("sourceType", "sourceId");`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stripe_events_event_id" ON "stripe_events" ("stripeEventId") WHERE "stripeEventId" IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stripe_events_type" ON "stripe_events" ("eventType");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stripe_events_source" ON "stripe_events" ("sourceType", "sourceId");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stripe_events_source";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stripe_events_type";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stripe_events_event_id";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_final_resolutions_source";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_final_resolutions_status";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_source";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_status";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refunds_source";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refunds_status";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "stripe_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "final_resolutions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "disputes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refunds";`);
  }
}
