import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOwnerBankInfo1733380000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'owner_bank_info',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },

          { name: 'userId', type: 'int', isNullable: false },

          // Encrypted fields
          { name: 'accountHolderNameEnc', type: 'text', isNullable: false },
          { name: 'routingNumberEnc', type: 'text', isNullable: false },
          { name: 'accountNumberEnc', type: 'text', isNullable: false },
          { name: 'bankNameEnc', type: 'text', isNullable: false },

          // Last4 for UI display
          { name: 'accountLast4', type: 'varchar', length: '4', isNullable: false },

          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
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
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('owner_bank_info');
  }
}
