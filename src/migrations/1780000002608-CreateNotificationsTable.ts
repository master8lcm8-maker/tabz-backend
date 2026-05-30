import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1780000002608 implements MigrationInterface {
  name = 'CreateNotificationsTable1780000002608';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "audience" character varying(32) NOT NULL DEFAULT 'user',
        "type" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'unread',
        "title" character varying(160) NOT NULL,
        "body" text,
        "sourceType" character varying(80),
        "sourceId" integer,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "audience" character varying(32) NOT NULL DEFAULT 'user'`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "status" character varying(32) NOT NULL DEFAULT 'unread'`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sourceType" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sourceId" integer`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadata" jsonb`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "body" DROP NOT NULL`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_audience" ON "notifications" ("audience")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_status" ON "notifications" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_audience"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_id"`);

    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "metadata"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "sourceId"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "sourceType"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "audience"`);
  }
}