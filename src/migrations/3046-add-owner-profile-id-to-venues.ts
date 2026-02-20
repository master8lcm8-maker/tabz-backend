import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOwnerProfileIdToVenues1733390000000 implements MigrationInterface {
  name = 'AddOwnerProfileIdToVenues1733390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    
    const isSqlite = (queryRunner.connection?.options as any)?.type === 'sqlite';// sqlite-safe: check column existence via PRAGMA
        if (isSqlite) {
          if (isSqlite) {
      const cols: Array<{ name: string }> = await queryRunner.query("PRAGMA table_info('venues')");
      const has =
        Array.isArray(cols) &&
        cols.some((c: any) => String(c?.name || '').toLowerCase() === 'ownerprofileid');
      if (!has) return;
    }await queryRunner.dropColumn('venues', 'ownerProfileId');
  }
}

