import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStaffTable1768804022771 implements MigrationInterface {
  name = "CreateStaffTable1768804022771";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const type = String((queryRunner.connection.options as any)?.type || "").toLowerCase();

    try {
      if (type === "postgres") {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "staff" (
            "id" SERIAL PRIMARY KEY,
            "venueId" integer NOT NULL,
            "name" varchar(255) NOT NULL,
            "email" varchar(255) NOT NULL,
            "passwordHash" varchar(255) NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_staff_email" UNIQUE ("email"),
            CONSTRAINT "FK_staff_venueId" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE
          );
        `);

        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_staff_venueId" ON "staff" ("venueId");
        `);
      } else {
        // SQLite
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "staff" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "venueId" integer NOT NULL,
            "name" varchar(255) NOT NULL,
            "email" varchar(255) NOT NULL,
            "passwordHash" varchar(255) NOT NULL,
            "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
            "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE
          );
        `);

        // Unique + index (SQLite)
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "UQ_staff_email" ON "staff" ("email");
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_staff_venueId" ON "staff" ("venueId");
        `);
      }
    } catch (e: any) {
      const msg = String(e?.message || e).toLowerCase();
      // tolerate idempotency / already exists
      if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("exists")) return;
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`DROP TABLE IF EXISTS "staff";`);
    } catch (e: any) {
      const msg = String(e?.message || e).toLowerCase();
      if (msg.includes("does not exist") || msg.includes("no such table")) return;
      throw e;
    }
  }
}
