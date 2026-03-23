import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStripeWebhookEvents2026030700000 implements MigrationInterface {
  name = 'CreateStripeWebhookEvents2026030700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stripe_webhook_events (
        id SERIAL PRIMARY KEY,
        "eventId" varchar NOT NULL UNIQUE,
        type varchar NOT NULL,
        payload jsonb NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "processedAt" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE stripe_webhook_events
    `);
  }
}