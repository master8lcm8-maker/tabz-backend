import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class P5PasswordReset1772103242847 implements MigrationInterface {
  name = 'P5PasswordReset1772103242847';

      public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_requests',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int', isNullable: false },
          { name: 'tokenHash', type: 'text', isNullable: false },
          { name: 'expiresAt', type: 'timestamptz', isNullable: false },
          { name: 'usedAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'password_reset_requests',
      new TableIndex({ name: 'IDX_password_reset_requests_userId', columnNames: ['userId'] })
    );

    await queryRunner.createIndex(
      'password_reset_requests',
      new TableIndex({ name: 'IDX_password_reset_requests_tokenHash', columnNames: ['tokenHash'] })
    );
  }

      public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('password_reset_requests', true);
  }

}
