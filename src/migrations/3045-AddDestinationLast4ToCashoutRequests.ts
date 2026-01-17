import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDestinationLast4ToCashoutRequests1733290000000 implements MigrationInterface {
  name = "AddDestinationLast4ToCashoutRequests1733290000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name='cashout_requests'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='cashout_requests'
      AND column_name='destinationLast4'
  ) THEN
    ALTER TABLE "cashout_requests" ADD "destinationLast4" character varying(4);
  END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='cashout_requests'
      AND column_name='destinationLast4'
  ) THEN
    ALTER TABLE "cashout_requests" DROP COLUMN "destinationLast4";
  END IF;
END $$;
`);
  }
}
