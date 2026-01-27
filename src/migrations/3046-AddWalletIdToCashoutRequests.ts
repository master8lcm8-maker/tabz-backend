import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletIdToCashoutRequests3046 implements MigrationInterface {
  // ✅ Must match what prod already recorded in public.migrations.name
  name = '3046-AddWalletIdToCashoutRequests';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Production already has walletId, so keep this migration safe/idempotent.
    await queryRunner.query(`
      ALTER TABLE "cashout_requests"
      ADD COLUMN IF NOT EXISTS "walletId" bigint;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cashout_requests"
      DROP COLUMN IF EXISTS "walletId";
    `);
  }
}
