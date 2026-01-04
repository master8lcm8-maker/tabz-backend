import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerProfileIdToVenues1733390000000
  implements MigrationInterface
{
  name = 'AddOwnerProfileIdToVenues1733390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "venues"
      ADD "ownerProfileId" int
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "venues"
      DROP COLUMN "ownerProfileId"
    `);
  }
}
