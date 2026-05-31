import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFoodOrders1770000000000 implements MigrationInterface {
  name = "CreateFoodOrders1770000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "food_orders" (
        "id" SERIAL NOT NULL,
        "senderId" integer NOT NULL,
        "recipientId" integer,
        "venueId" integer NOT NULL,
        "foodName" character varying(120) NOT NULL,
        "amountCents" integer NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "message" character varying(255),
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "redemptionCode" character varying(64) NOT NULL,
        "redeemedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_food_orders_redemptionCode" UNIQUE ("redemptionCode")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_senderId"
      ON "food_orders" ("senderId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_recipientId"
      ON "food_orders" ("recipientId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_venueId"
      ON "food_orders" ("venueId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_status"
      ON "food_orders" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_redemptionCode"
      ON "food_orders" ("redemptionCode")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_food_orders_venueId_venues_id'
            AND table_name = 'food_orders'
        ) THEN
          ALTER TABLE "food_orders"
          ADD CONSTRAINT "FK_food_orders_venueId_venues_id"
          FOREIGN KEY ("venueId") REFERENCES "venues"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      DROP CONSTRAINT IF EXISTS "FK_food_orders_venueId_venues_id"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_orders_redemptionCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_orders_venueId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_orders_recipientId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_orders_senderId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "food_orders"`);
  }
}
