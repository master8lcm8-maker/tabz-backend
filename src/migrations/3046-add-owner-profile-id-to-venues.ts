import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddOwnerProfileIdToVenues1733390000000 implements MigrationInterface {
  name = "AddOwnerProfileIdToVenues1733390000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasColumn("venues", "ownerProfileId");
    if (has) return;

    await queryRunner.addColumn(
      "venues",
      new TableColumn({
        name: "ownerProfileId",
        type: "integer",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasColumn("venues", "ownerProfileId");
    if (!has) return;

    await queryRunner.dropColumn("venues", "ownerProfileId");
  }
}
