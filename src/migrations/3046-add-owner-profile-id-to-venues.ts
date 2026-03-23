import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOwnerProfileIdToVenues1733390000000 implements MigrationInterface {
  name = "AddOwnerProfileIdToVenues1733390000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name='venues'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='venues'
      AND column_name='ownerProfileId'
  ) THEN
    ALTER TABLE "venues" ADD "ownerProfileId" int;
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
      AND table_name='venues'
      AND column_name='ownerProfileId'
  ) THEN
    ALTER TABLE "venues" DROP COLUMN "ownerProfileId";
  END IF;
END $$;
`);
  }
}
