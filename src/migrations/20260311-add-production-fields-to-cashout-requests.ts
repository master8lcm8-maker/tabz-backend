import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductionFieldsToCashoutRequests2026031100000 implements MigrationInterface {
  name = 'AddProductionFieldsToCashoutRequests2026031100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "idempotencyKey" varchar`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "stripePayoutId" varchar`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "stripeTransferId" varchar`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "stripeAccountId" varchar`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "providerStatus" varchar`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "reversedAt"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "settledAt"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "processedAt"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "providerStatus"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "stripeAccountId"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "stripeTransferId"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "stripePayoutId"`);
    await queryRunner.query(`ALTER TABLE "cashout_requests" DROP COLUMN IF EXISTS "idempotencyKey"`);
  }
}