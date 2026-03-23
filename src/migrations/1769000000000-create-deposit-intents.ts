import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDepositIntents1769000000000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deposit_intents (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "amountCents" INTEGER NOT NULL,
        currency VARCHAR NOT NULL,
        "stripePaymentIntentId" VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'created',
        "createdAt" timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_deposit_intents_stripe
      ON deposit_intents("stripePaymentIntentId")
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS deposit_intents`);
  }
}
