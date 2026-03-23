import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsersDisplayName1768723743137 implements MigrationInterface {
  name = 'AddUsersDisplayName1768723743137'

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "displayName" varchar(255) NULL;`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      // SQLite: "duplicate column name: displayName"
      // Postgres: "column \"displayName\" of relation \"users\" already exists"
      if (
        msg.toLowerCase().includes('duplicate column') ||
        msg.toLowerCase().includes('already exists')
      ) {
        return;
      }
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "displayName";`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      // SQLite often doesn't support DROP COLUMN (older versions); allow no-op if not supported
      if (
        msg.toLowerCase().includes('no such column') ||
        msg.toLowerCase().includes('does not exist') ||
        msg.toLowerCase().includes('syntax error')
      ) {
        return;
      }
      throw e;
    }
  }
}
