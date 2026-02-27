import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsersDisplayName1768723743137 implements MigrationInterface {
  name = "AddUsersDisplayName1768723743137";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    await queryRunner.query(`
      ALTER TABLE public."users"
      ADD COLUMN IF NOT EXISTS "displayName" varchar(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op (avoid destructive down)
    return;
  }
}
