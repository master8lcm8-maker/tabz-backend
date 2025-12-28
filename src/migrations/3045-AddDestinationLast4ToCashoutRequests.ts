import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDestinationLast4ToCashoutRequests1733290000000
  implements MigrationInterface
{
  name = 'AddDestinationLast4ToCashoutRequests1733290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cashout_requests" ADD "destinationLast4" character varying(4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cashout_requests" DROP COLUMN "destinationLast4"`,
    );
  }
}
