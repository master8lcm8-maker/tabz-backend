import "reflect-metadata";
import { DataSource } from "typeorm";

const root = __dirname.replace(/\\/g, "/");

// If DATABASE_URL exists, assume Postgres.
// Otherwise if DB_HOST exists, assume Postgres.
// Otherwise fall back to local SQLite dev file.
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasDbHost = !!process.env.DB_HOST;
const usePostgres = hasDatabaseUrl || hasDbHost;

const sslEnabled =
  String(process.env.DB_SSL || "").toLowerCase() === "true" ||
  String(process.env.DB_SSL || "").toLowerCase() === "1" ||
  // DigitalOcean URLs often include sslmode=require; allow that to imply SSL too
  String(process.env.DATABASE_URL || "").toLowerCase().includes("sslmode=require");

export default new DataSource(
  usePostgres
    ? {
        type: "postgres",
        // Prefer DATABASE_URL when present (single source of truth)
        ...(hasDatabaseUrl
          ? { url: process.env.DATABASE_URL }
          : {
              host: process.env.DB_HOST,
              port: Number(process.env.DB_PORT || 5432),
              username: process.env.DB_USERNAME,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
            }),
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,

        entities: [root + "/**/*.entity.ts", root + "/**/*.entity.js"],
        migrations: [root + "/migrations/*.ts", root + "/migrations/*.js"],
        synchronize: false,
        migrationsRun: true,
      }
    : {
        type: "sqlite",
        database: "tabz-dev.sqlite",
        entities: [root + "/**/*.entity.ts", root + "/**/*.entity.js"],
        migrations: [root + "/migrations/*.ts", root + "/migrations/*.js"],
        synchronize: false,
        migrationsRun: true,
      }
);
