import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepositRefWalletTransactions1769100000000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      ADD COLUMN IF NOT EXISTS "depositRef" VARCHAR
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_deposit_ref
      ON wallet_transactions("depositRef")
      WHERE "depositRef" IS NOT NULL
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_wallet_transactions_deposit_ref
    `);

    await queryRunner.query(`
      ALTER TABLE wallet_transactions
      DROP COLUMN IF EXISTS "depositRef"
    `);

  }

}
