import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletIdToCashoutRequests1733410000000 implements MigrationInterface {
  // Must match what prod already recorded in public.migrations.name
  name = 'AddWalletIdToCashoutRequests1733410000000';

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
