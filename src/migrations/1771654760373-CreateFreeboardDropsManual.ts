import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFreeboardDropsManual1771654760373 implements MigrationInterface {
  name = 'CreateFreeboardDropsManual1771654760373';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasTable('freeboard_drops');
    if (has) return;

    await queryRunner.query(`
      CREATE TABLE "freeboard_drops" (
        "id" SERIAL PRIMARY KEY,
        "creatorId" integer NOT NULL,
        "venueId" integer NOT NULL,
        "title" varchar NOT NULL,
        "description" varchar,
        "rewardCents" bigint NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "claimedByUserId" integer,
        "claimCode" varchar,
        "expiresAt" timestamptz,
        "claimedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_freeboard_drops_venueId"
      ON "freeboard_drops" ("venueId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "freeboard_drops";`);
  }
}
