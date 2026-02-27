import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDestinationLast4ToCashoutRequests1733290000000 implements MigrationInterface {
  name = 'AddDestinationLast4ToCashoutRequests1733290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite-only (kept for reference; breaks on Postgres):
// const cols: (sqlite-only) = await`r`n// queryRunner.query("PRAGMA table_info('cashout_requests')");
    // const has =
    //   Array.isArray(cols) &&
    //   cols.some((c: any) => String(c?.name || '').toLowerCase() === 'destinationlast4');
    // if (has) return;

    // Cross-db check (works on Postgres + SQLite in TypeORM):
    const has = await queryRunner.hasColumn('cashout_requests', 'destinationLast4');
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
    // SQLite-only (kept for reference; breaks on Postgres):
// const cols: (sqlite-only) = await`r`n// queryRunner.query("PRAGMA table_info('cashout_requests')");
    // const has =
    //   Array.isArray(cols) &&
    //   cols.some((c: any) => String(c?.name || '').toLowerCase() === 'destinationlast4');
    // if (!has) return;

    // Cross-db check:
    const has = await queryRunner.hasColumn('cashout_requests', 'destinationLast4');
    if (!has) return;

    await queryRunner.dropColumn('cashout_requests', 'destinationLast4');
  }
}