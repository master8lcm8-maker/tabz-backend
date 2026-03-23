import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateReferralSystem2026030701000 implements MigrationInterface {
  name = 'CreateReferralSystem2026030701000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Create ENUM first (required by Postgres) ----
    await queryRunner.query(
      `CREATE TYPE "referral_reward_status_enum" AS ENUM ('pending','issued','rejected')`,
    );

    // ---- referral_codes ----
    await queryRunner.createTable(
      new Table({
        name: 'referral_codes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'owner_user_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: 'true',
          },
          {
            name: 'disabled_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'referral_codes',
      new TableIndex({
        name: 'UQ_referral_codes_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'referral_codes',
      new TableIndex({
        name: 'UQ_referral_codes_owner_user_id',
        columnNames: ['owner_user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'referral_codes',
      new TableForeignKey({
        columnNames: ['owner_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_referral_codes_owner_user_id',
      }),
    );

    // ---- referral_attributions ----
    await queryRunner.createTable(
      new Table({
        name: 'referral_attributions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'referral_code_id',
            type: 'uuid',
          },
          {
            name: 'referrer_user_id',
            type: 'bigint',
          },
          {
            name: 'referred_user_id',
            type: 'bigint',
          },
          {
            name: 'referral_code_snapshot',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'attributed_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'qualified_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'is_qualified',
            type: 'boolean',
            default: 'false',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
        checks: [
          new TableCheck({
            name: 'CHK_referral_attributions_not_self_referral',
            expression: '"referred_user_id" <> "referrer_user_id"',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'referral_attributions',
      new TableIndex({
        name: 'UQ_referral_attributions_referred_user_id',
        columnNames: ['referred_user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'referral_attributions',
      new TableIndex({
        name: 'IDX_referral_attributions_referrer_user_id',
        columnNames: ['referrer_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'referral_attributions',
      new TableIndex({
        name: 'IDX_referral_attributions_referral_code_id',
        columnNames: ['referral_code_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'referral_attributions',
      new TableForeignKey({
        columnNames: ['referral_code_id'],
        referencedTableName: 'referral_codes',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'FK_referral_attributions_referral_code_id',
      }),
    );

    await queryRunner.createForeignKey(
      'referral_attributions',
      new TableForeignKey({
        columnNames: ['referrer_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'FK_referral_attributions_referrer_user_id',
      }),
    );

    await queryRunner.createForeignKey(
      'referral_attributions',
      new TableForeignKey({
        columnNames: ['referred_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_referral_attributions_referred_user_id',
      }),
    );

    // ---- referral_rewards ----
    await queryRunner.createTable(
      new Table({
        name: 'referral_rewards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'attribution_id',
            type: 'uuid',
          },
          {
            name: 'beneficiary_user_id',
            type: 'bigint',
          },
          {
            name: 'amount_minor',
            type: 'integer',
          },
          {
            name: 'currency_code',
            type: 'varchar',
            length: '16',
            default: "'USD'",
          },
          {
            name: 'status',
            type: 'referral_reward_status_enum',
            default: "'pending'",
          },
          {
            name: 'ledger_entry_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'issued_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'referral_rewards',
      new TableIndex({
        name: 'UQ_referral_rewards_attribution_id',
        columnNames: ['attribution_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'referral_rewards',
      new TableIndex({
        name: 'IDX_referral_rewards_beneficiary_user_id',
        columnNames: ['beneficiary_user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'referral_rewards',
      new TableForeignKey({
        columnNames: ['attribution_id'],
        referencedTableName: 'referral_attributions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_referral_rewards_attribution_id',
      }),
    );

    await queryRunner.createForeignKey(
      'referral_rewards',
      new TableForeignKey({
        columnNames: ['beneficiary_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'FK_referral_rewards_beneficiary_user_id',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'referral_rewards',
      'FK_referral_rewards_beneficiary_user_id',
    );
    await queryRunner.dropForeignKey(
      'referral_rewards',
      'FK_referral_rewards_attribution_id',
    );
    await queryRunner.dropIndex(
      'referral_rewards',
      'IDX_referral_rewards_beneficiary_user_id',
    );
    await queryRunner.dropIndex(
      'referral_rewards',
      'UQ_referral_rewards_attribution_id',
    );
    await queryRunner.dropTable('referral_rewards');

    await queryRunner.dropForeignKey(
      'referral_attributions',
      'FK_referral_attributions_referred_user_id',
    );
    await queryRunner.dropForeignKey(
      'referral_attributions',
      'FK_referral_attributions_referrer_user_id',
    );
    await queryRunner.dropForeignKey(
      'referral_attributions',
      'FK_referral_attributions_referral_code_id',
    );
    await queryRunner.dropIndex(
      'referral_attributions',
      'IDX_referral_attributions_referral_code_id',
    );
    await queryRunner.dropIndex(
      'referral_attributions',
      'IDX_referral_attributions_referrer_user_id',
    );
    await queryRunner.dropIndex(
      'referral_attributions',
      'UQ_referral_attributions_referred_user_id',
    );
    await queryRunner.dropTable('referral_attributions');

    await queryRunner.dropForeignKey(
      'referral_codes',
      'FK_referral_codes_owner_user_id',
    );
    await queryRunner.dropIndex(
      'referral_codes',
      'UQ_referral_codes_owner_user_id',
    );
    await queryRunner.dropIndex(
      'referral_codes',
      'UQ_referral_codes_code',
    );
    await queryRunner.dropTable('referral_codes');

    await queryRunner.query(
      `DROP TYPE IF EXISTS "referral_reward_status_enum"`,
    );
  }
}


