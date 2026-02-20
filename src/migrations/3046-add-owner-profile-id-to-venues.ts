import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOwnerProfileIdToVenues1733390000000 implements MigrationInterface {
  name = 'AddOwnerProfileIdToVenues1733390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // sqlite-safe: check column existence via PRAGMA
    const cols: Array<{ name: string }> = await queryRunner.query("PRAGMA table_info('venues')");
    const has =
      Array.isArray(cols) &&
      cols.some((c: any) => String(c?.name || '').toLowerCase() === 'ownerprofileid');
    if (has) return;

    await queryRunner.addColumn(
      'venues',
      new TableColumn({
        name: 'ownerProfileId',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols: Array<{ name: string }> = await queryRunner.query("PRAGMA table_info('venues')");
    const has =
      Array.isArray(cols) &&
      cols.some((c: any) => String(c?.name || '').toLowerCase() === 'ownerprofileid');
    if (!has) return;

    await queryRunner.dropColumn('venues', 'ownerProfileId');
  }
}
