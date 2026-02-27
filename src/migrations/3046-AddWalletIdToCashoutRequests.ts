import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWalletIdToCashoutRequests0000000003046 implements MigrationInterface {
  // NOTE: omit instance name; TypeORM derives name from class constructor (must end with 13-digit timestamp)

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    await queryRunner.query(`
      ALTER TABLE public."cashout_requests"
      ADD COLUMN IF NOT EXISTS "walletId" bigint;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op (avoid destructive down)
    return;
  }
}
