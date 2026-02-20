import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class CreateOwnerBankInfo1733380000000 implements MigrationInterface {
  name = "CreateOwnerBankInfo1733380000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasTable("owner_bank_info");
    if (has) return;

    // Cross-DB safe table definition (works on sqlite + postgres)
    await queryRunner.createTable(
      new Table({
        name: "owner_bank_info",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "userId", type: "integer", isNullable: false },

          { name: "accountHolderNameEnc", type: "text", isNullable: false },
          { name: "routingNumberEnc", type: "text", isNullable: false },
          { name: "accountNumberEnc", type: "text", isNullable: false },
          { name: "bankNameEnc", type: "text", isNullable: false },

          // varchar works on both; sqlite ignores length enforcement but accepts it
          { name: "accountLast4", type: "varchar", length: "4", isNullable: false },

          // Use DB-specific defaults (sqlite vs postgres) without raw SQL blocks
          {
            name: "createdAt",
            type: (queryRunner.connection.options as any).type === "sqlite" ? "datetime" : "timestamp",
            isNullable: false,
            default:
              (queryRunner.connection.options as any).type === "sqlite"
                ? "(datetime('now'))"
                : "now()",
          },
          {
            name: "updatedAt",
            type: (queryRunner.connection.options as any).type === "sqlite" ? "datetime" : "timestamp",
            isNullable: false,
            default:
              (queryRunner.connection.options as any).type === "sqlite"
                ? "(datetime('now'))"
                : "now()",
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "owner_bank_info",
      new TableForeignKey({
        name: "FK_860594f8113e6a1c27b54ad0d6e",
        columnNames: ["userId"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasTable("owner_bank_info");
    if (!has) return;

    // dropTable(true) drops FKs too (safe across DBs)
    await queryRunner.dropTable("owner_bank_info", true);
  }
}
