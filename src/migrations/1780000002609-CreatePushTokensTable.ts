import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePushTokensTable1780000002609 implements MigrationInterface {
  name = 'CreatePushTokensTable1780000002609';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_tokens" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "platform" character varying(32) NOT NULL DEFAULT 'unknown',
        "token" character varying(512) NOT NULL,
        "deviceId" character varying(160),
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_tokens_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_tokens_token_unique" ON "push_tokens" ("token")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_push_tokens_user_id" ON "push_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_push_tokens_active" ON "push_tokens" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_tokens_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_tokens_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_tokens_token_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "push_tokens"`);
  }
}
