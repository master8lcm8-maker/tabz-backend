import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStaffTable1768804022771 implements MigrationInterface {
  name = "CreateStaffTable1768804022771";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    // === ensure table public.staff ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."staff" (
  "id" int DEFAULT nextval('staff_id_seq'::regclass) NOT NULL,
  "venueId" int NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "passwordHash" varchar(255) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
      );
    `);

    // unique: UQ_staff_email
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_staff_email'
        ) THEN
          ALTER TABLE public."staff"
            ADD CONSTRAINT "UQ_staff_email" UNIQUE ("email");
        END IF;
      END $$;
    `);

    // fk: FK_staff_venueId
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_staff_venueId'
        ) THEN
          ALTER TABLE public."staff"
            ADD CONSTRAINT "FK_staff_venueId"
            FOREIGN KEY ("venueId")
            REFERENCES "public"."venues" ("id");
        END IF;
      END $$;
    `);

    // index: IDX_staff_venueId
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staff_venueId" ON public.staff USING btree ("venueId")`);

    // index: UQ_staff_email
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_staff_email" ON public.staff USING btree (email)`);

    // index: staff_pkey
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS staff_pkey ON public.staff USING btree (id)`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op (prod truth restore). Do NOT drop prod tables.
    return;
  }
}
