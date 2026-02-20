import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOwnerBankInfo1733380000000 implements MigrationInterface {
  name = 'CreateOwnerBankInfo1733380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    
    const isSqlite = (queryRunner.connection?.options as any)?.type === 'sqlite';// idempotent: if table exists, do nothing
        if (isSqlite) {
      const rows: Array<{ name: string }> = await queryRunner.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='owner_bank_info'"
      );
      if (Array.isArray(rows) && rows.length > 0) return;
    }// sqlite requires INTEGER PRIMARY KEY AUTOINCREMENT (not int)
        if (isSqlite) {
      await queryRunner.query(
        CREATE TABLE "owner_bank_info" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "userId" integer NOT NULL,
          "accountHolderNameEnc" text NOT NULL,
          "routingNumberEnc" text NOT NULL,
          "accountNumberEnc" text NOT NULL,
          "bankNameEnc" text NOT NULL,
          "accountLast4" varchar(4) NOT NULL,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "FK_860594f8113e6a1c27b54ad0d6e"
            FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
        )
      );
    } else {
      await queryRunner.query(
        CREATE TABLE "owner_bank_info" (
          "id" SERIAL PRIMARY KEY,
          "userId" integer NOT NULL,
          "accountHolderNameEnc" text NOT NULL,
          "routingNumberEnc" text NOT NULL,
          "accountNumberEnc" text NOT NULL,
          "bankNameEnc" text NOT NULL,
          "accountLast4" varchar(4) NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now()
        )
      );
      await queryRunner.query(
        ALTER TABLE "owner_bank_info"
        ADD CONSTRAINT "FK_860594f8113e6a1c27b54ad0d6e"
        FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    }}

  public async down(queryRunner: QueryRunner): Promise<void> {
        if (isSqlite) {
      await queryRunner.query(
        CREATE TABLE "owner_bank_info" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "userId" integer NOT NULL,
          "accountHolderNameEnc" text NOT NULL,
          "routingNumberEnc" text NOT NULL,
          "accountNumberEnc" text NOT NULL,
          "bankNameEnc" text NOT NULL,
          "accountLast4" varchar(4) NOT NULL,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "FK_860594f8113e6a1c27b54ad0d6e"
            FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
        )
      );
    } else {
      await queryRunner.query(
        CREATE TABLE "owner_bank_info" (
          "id" SERIAL PRIMARY KEY,
          "userId" integer NOT NULL,
          "accountHolderNameEnc" text NOT NULL,
          "routingNumberEnc" text NOT NULL,
          "accountNumberEnc" text NOT NULL,
          "bankNameEnc" text NOT NULL,
          "accountLast4" varchar(4) NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now()
        )
      );
      await queryRunner.query(
        ALTER TABLE "owner_bank_info"
        ADD CONSTRAINT "FK_860594f8113e6a1c27b54ad0d6e"
        FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    }}
}

