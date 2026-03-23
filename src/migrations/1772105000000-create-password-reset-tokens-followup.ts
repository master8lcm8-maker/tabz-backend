import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePasswordResetTokensFollowup1772105000000 implements MigrationInterface {
name = "CreatePasswordResetTokensFollowup1772105000000";

public async up(queryRunner: QueryRunner): Promise<void> {

await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
"id" SERIAL PRIMARY KEY,
"userId" BIGINT NOT NULL,
"tokenHash" VARCHAR(128) NOT NULL,
"expiresAt" TIMESTAMPTZ NOT NULL,
"usedAt" TIMESTAMPTZ NULL,
"requestedIp" TEXT NULL,
"requestedUserAgent" TEXT NULL,
"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
)
`);

await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_password_reset_user"
ON "password_reset_tokens" ("userId")
`);

await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_password_reset_hash"
ON "password_reset_tokens" ("tokenHash")
`);

await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_password_reset_expiry"
ON "password_reset_tokens" ("expiresAt")
`);

}

public async down(queryRunner: QueryRunner): Promise<void> {

await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_reset_expiry"`);
await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_reset_hash"`);
await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_reset_user"`);

await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);

}
}
