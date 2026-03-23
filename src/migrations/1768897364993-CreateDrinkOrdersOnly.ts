import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDrinkOrdersOnly1768897364993 implements MigrationInterface {
  name = 'CreateDrinkOrdersOnly1768897364993'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drink_orders" (
        "id" SERIAL NOT NULL,
        "buyerId" integer NOT NULL,
        "venueId" integer NOT NULL,
        "customerName" character varying(100) NOT NULL,
        "drinkName" character varying(100) NOT NULL,
        "priceCents" integer NOT NULL,
        "note" text,
        "status" text NOT NULL DEFAULT 'PENDING',
        "redemptionCode" character varying(64) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "redeemedAt" TIMESTAMP,
        CONSTRAINT "PK_drink_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_drink_orders_redemptionCode" UNIQUE ("redemptionCode")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drink_orders_buyerId" ON "drink_orders" ("buyerId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drink_orders_venueId" ON "drink_orders" ("venueId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drink_orders_status" ON "drink_orders" ("status")
    `);

    await queryRunner.query(`
      ALTER TABLE "drink_orders"
      ADD CONSTRAINT "FK_drink_orders_venueId"
      FOREIGN KEY ("venueId") REFERENCES "venues"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "drink_orders" DROP CONSTRAINT IF EXISTS "FK_drink_orders_venueId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_drink_orders_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_drink_orders_venueId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_drink_orders_buyerId"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "drink_orders"
    `);
  }
}
