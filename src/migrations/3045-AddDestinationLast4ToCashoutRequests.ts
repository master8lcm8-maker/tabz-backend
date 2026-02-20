import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDestinationLast4ToCashoutRequests1733290000000 implements MigrationInterface {
  name = 'AddDestinationLast4ToCashoutRequests1733290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // sqlite-safe: check column existence via PRAGMA
    const cols: Array<{ name: string }> = await queryRunner.query("PRAGMA table_info('cashout_requests')");
    const has =
      Array.isArray(cols) &&
      cols.some((c: any) => String(c?.name || '').toLowerCase() === 'destinationlast4');
    if (has) return;

    await queryRunner.addColumn(
      'cashout_requests',
      new TableColumn({
        name: 'destinationLast4',
        type: 'varchar',
        length: '4',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols: Array<{ name: string }> = await queryRunner.query("PRAGMA table_info('cashout_requests')");
    const has =
      Array.isArray(cols) &&
      cols.some((c: any) => String(c?.name || '').toLowerCase() === 'destinationlast4');
    if (!has) return;

    await queryRunner.dropColumn('cashout_requests', 'destinationLast4');
  }
}
