import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDrinkOrdersOnly1768897364993 implements MigrationInterface {
  name = "CreateDrinkOrdersOnly1768897364993";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    // === ensure table public.drink_orders ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."drink_orders" (
  "id" int DEFAULT nextval('drink_orders_id_seq'::regclass) NOT NULL,
  "buyerId" int NOT NULL,
  "venueId" int NOT NULL,
  "customerName" varchar(100) NOT NULL,
  "drinkName" varchar(100) NOT NULL,
  "priceCents" int NOT NULL,
  "note" text,
  "status" text DEFAULT 'PENDING'::text NOT NULL,
  "redemptionCode" varchar(64) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "redeemedAt" timestamp,
  CONSTRAINT "drink_orders_pkey" PRIMARY KEY ("id")
      );
    `);

    // unique: UQ_drink_orders_redemptionCode
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_drink_orders_redemptionCode'
        ) THEN
          ALTER TABLE public."drink_orders"
            ADD CONSTRAINT "UQ_drink_orders_redemptionCode" UNIQUE ("redemptionCode");
        END IF;
      END $$;
    `);

    // fk: FK_drink_orders_venueId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_drink_orders_venueId'
        ) THEN
          ALTER TABLE public."drink_orders"
            ADD CONSTRAINT "FK_drink_orders_venueId"
            FOREIGN KEY ("venueId")
            REFERENCES "public"."venues" ("id");
        END IF;
      END $$;
    `);

    // index: IDX_drink_orders_buyerId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_drink_orders_buyerId" ON public.drink_orders USING btree ("buyerId")`);

    // index: IDX_drink_orders_status
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_drink_orders_status" ON public.drink_orders USING btree (status)`);

    // index: IDX_drink_orders_venueId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_drink_orders_venueId" ON public.drink_orders USING btree ("venueId")`);

    // index: PK_drink_orders_id
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "PK_drink_orders_id" ON public.drink_orders USING btree (id)`);

    // index: UQ_drink_orders_redemptionCode
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_drink_orders_redemptionCode" ON public.drink_orders USING btree ("redemptionCode")`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op (prod truth restore). Do NOT drop prod tables.
    return;
  }
}
