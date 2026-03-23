import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeFieldsToOwnerBankInfos2026031303000 implements MigrationInterface {
  name = 'AddStripeFieldsToOwnerBankInfos2026031303000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      ADD COLUMN IF NOT EXISTS "stripeAccountId" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      DROP COLUMN IF EXISTS "stripePayoutsEnabled"
    `);

    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      DROP COLUMN IF EXISTS "stripeChargesEnabled"
    `);

    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      DROP COLUMN IF EXISTS "stripeDetailsSubmitted"
    `);

    await queryRunner.query(`
      ALTER TABLE "owner_bank_infos"
      DROP COLUMN IF EXISTS "stripeAccountId"
    `);
  }
}
