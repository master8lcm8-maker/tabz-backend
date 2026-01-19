import "reflect-metadata";
import { DataSource } from "typeorm";

const rawUrl = process.env.DATABASE_URL || process.env.TYPEORM_URL;

// Normalize URL: strip sslmode=require (we control SSL via ssl option/env flags)
const url = rawUrl
  ? rawUrl
      .replace(/([?&])sslmode=require(&?)/i, "$1")
      .replace(/[?&]$/, "")
      .replace(/\?&/, "?")
  : undefined;

const sslFlag = (process.env.TABZ_PG_SSL || process.env.DB_SSL || process.env.PGSSLMODE || "")
  .toLowerCase()
  .trim();

const useSsl =
  sslFlag === "1" || sslFlag === "true" || sslFlag === "require" || sslFlag === "on";

const ssl = useSsl ? { rejectUnauthorized: false } : false;

console.log("TABZ_DB_DEBUG", {
  DATABASE_URL: url ? "[set]" : undefined,
  TYPEORM_URL: process.env.TYPEORM_URL ? "[set]" : undefined,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_NAME: process.env.DB_NAME,
  SSL: useSsl ? "on(rejectUnauthorized=false)" : "off",
});

export default new DataSource(
  url
    ? {
        type: "postgres",
        url,
        entities: ["dist/**/*.entity.js"],
        migrations: ["dist/migrations/*.js"],
        synchronize: false,
        logging: false,
        ssl,
      }
    : {
        type: "postgres",
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.DB_USERNAME || process.env.DB_USER,
        password: process.env.DB_PASSWORD || process.env.DB_PASS,
        database: process.env.DB_NAME,
        entities: ["dist/**/*.entity.js"],
        migrations: ["dist/migrations/*.js"],
        synchronize: false,
        logging: false,
        ssl,
      }
);
