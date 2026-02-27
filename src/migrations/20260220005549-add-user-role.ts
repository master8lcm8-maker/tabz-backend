import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserRole20260220005549 implements MigrationInterface {
  name = 'AddUserRole20260220005549';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite-only (kept for reference; breaks on Postgres):
// const cols: (sqlite-only) = await`r`n// queryRunner.query("PRAGMA table_info('users')");
    // const hasRole =
    //   Array.isArray(cols) &&
    //   cols.some((c: any) => String(c?.name || '').toLowerCase() === 'role');

    // Cross-db check (works on Postgres + SQLite in TypeORM):
    const hasRole = await queryRunner.hasColumn('users', 'role');
    if (hasRole) return;

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'varchar',
        isNullable: false,
        default: "'buyer'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite-only (kept for reference; breaks on Postgres):
// const cols: (sqlite-only) = await`r`n// queryRunner.query("PRAGMA table_info('users')");
    // const hasRole =
    //   Array.isArray(cols) &&
    //   cols.some((c: any) => String(c?.name || '').toLowerCase() === 'role');

    // Cross-db check:
    const hasRole = await queryRunner.hasColumn('users', 'role');
    if (!hasRole) return;

    await queryRunner.dropColumn('users', 'role');
  }
}