import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairOwnerBankInfos1771586850506 implements MigrationInterface {
  name = 'RepairOwnerBankInfos1771586850506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Ensure table exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "owner_bank_infos" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "accountHolderNameEnc" text NOT NULL,
        "routingNumberEnc" text NOT NULL,
        "accountNumberEnc" text NOT NULL,
        "bankNameEnc" text NOT NULL,
        "accountLast4" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_owner_bank_infos_id" PRIMARY KEY ("id")
      )
    `);

    // 2) Ensure canonical columns exist (idempotent)
    const cols: Array<{ name: string; typeSql: string }> = [
      { name: 'userId', typeSql: 'integer NOT NULL' },
      { name: 'accountHolderNameEnc', typeSql: 'text NOT NULL' },
      { name: 'routingNumberEnc', typeSql: 'text NOT NULL' },
      { name: 'accountNumberEnc', typeSql: 'text NOT NULL' },
      { name: 'bankNameEnc', typeSql: 'text NOT NULL' },
      { name: 'accountLast4', typeSql: 'character varying NOT NULL' },
      { name: 'createdAt', typeSql: 'TIMESTAMP NOT NULL DEFAULT now()' },
      { name: 'updatedAt', typeSql: 'TIMESTAMP NOT NULL DEFAULT now()' },
    ];

    for (const c of cols) {
      await queryRunner.query(`
        ALTER TABLE "owner_bank_infos"
        ADD COLUMN IF NOT EXISTS "${c.name}" ${c.typeSql}
      `);
    }

    // 3) Ensure an index exists on userId (idempotent)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_owner_bank_infos_userId"
      ON "owner_bank_infos" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migrations should be safe; do not drop prod payout PII tables automatically.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_owner_bank_infos_userId"`);
    // Intentionally NOT dropping table/columns in down.
  }
}
