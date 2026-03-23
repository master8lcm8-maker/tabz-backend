import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEmailVerificationTokensFollowup1772106000000 implements MigrationInterface {
name = "CreateEmailVerificationTokensFollowup1772106000000";

public async up(queryRunner: QueryRunner): Promise<void> {

await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
"id" SERIAL PRIMARY KEY,
"userId" BIGINT NOT NULL,
"tokenHash" VARCHAR(128) NOT NULL,
"expiresAt" TIMESTAMPTZ NOT NULL,
"usedAt" TIMESTAMPTZ NULL,
"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
)
`);

await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_email_verification_user"
ON "email_verification_tokens" ("userId")
`);

await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_email_verification_hash"
ON "email_verification_tokens" ("tokenHash")
`);

await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_email_verification_expiry"
ON "email_verification_tokens" ("expiresAt")
`);

}

public async down(queryRunner: QueryRunner): Promise<void> {

await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_verification_expiry"`);
await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_verification_hash"`);
await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_verification_user"`);

await queryRunner.query(`DROP TABLE IF EXISTS "email_verification_tokens"`);

}
}