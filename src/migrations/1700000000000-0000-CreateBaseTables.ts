import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBaseTables1700000000000 implements MigrationInterface {
  private isSqlite(qr: QueryRunner) {
    const t = (qr.connection as any)?.options?.type;
    return t === "sqlite" || t === "better-sqlite3";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqlite = this.isSqlite(queryRunner);

    if (sqlite) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "email" varchar(255) NOT NULL UNIQUE,
          "passwordHash" varchar(255),
          "role" varchar(32) NOT NULL DEFAULT 'buyer',
          "venueId" integer,
          "profileId" integer,
          "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "profiles" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "userId" integer NOT NULL,
          "type" varchar(32) NOT NULL,
          "displayName" varchar(255) NOT NULL,
          "slug" varchar(255) NOT NULL UNIQUE,
          "bio" text,
          "avatarUrl" text,
          "isActive" boolean NOT NULL DEFAULT 1,
          "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "venues" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "name" varchar(255) NOT NULL,
          "slug" varchar(255) NOT NULL UNIQUE,
          "country" varchar(64),
          "avatarUrl" text,
          "coverUrl" text,
          "ownerProfileId" integer,
          "isActive" boolean NOT NULL DEFAULT 1,
          "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "cashout_requests" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "ownerProfileId" integer,
          "amountCents" integer NOT NULL DEFAULT 0,
          "status" varchar(32) NOT NULL DEFAULT 'pending',
          "destinationType" varchar(32),
          "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );
      `);

      return;
    }

    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='users'
  ) THEN
    CREATE TABLE "users" (
      "id" BIGSERIAL PRIMARY KEY,
      "email" varchar(255) NOT NULL UNIQUE,
      "passwordHash" varchar(255) NULL,
      "role" varchar(32) NOT NULL DEFAULT 'buyer',
      "venueId" bigint NULL,
      "profileId" bigint NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;
`);

    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    CREATE TABLE "profiles" (
      "id" BIGSERIAL PRIMARY KEY,
      "userId" bigint NOT NULL,
      "type" varchar(32) NOT NULL,
      "displayName" varchar(255) NOT NULL,
      "slug" varchar(255) NOT NULL UNIQUE,
      "bio" text NULL,
      "avatarUrl" text NULL,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE "profiles"
      ADD CONSTRAINT "profiles_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE;
  END IF;
END $$;
`);

    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='venues'
  ) THEN
    CREATE TABLE "venues" (
      "id" BIGSERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "slug" varchar(255) NOT NULL UNIQUE,
      "country" varchar(64) NULL,
      "avatarUrl" text NULL,
      "coverUrl" text NULL,
      "ownerProfileId" bigint NULL,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;
`);

    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cashout_requests'
  ) THEN
    CREATE TABLE "cashout_requests" (
      "id" BIGSERIAL PRIMARY KEY,
      "ownerProfileId" bigint NULL,
      "amountCents" integer NOT NULL DEFAULT 0,
      "status" varchar(32) NOT NULL DEFAULT 'pending',
      "destinationType" varchar(32) NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cashout_requests";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "venues";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
