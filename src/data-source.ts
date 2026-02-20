import "reflect-metadata";
import { DataSource } from "typeorm";

const root = __dirname.replace(/\\/g, "/");

// If DB_HOST exists, assume production Postgres (DigitalOcean)
// Otherwise fall back to local SQLite dev file.
const isPostgres = !!process.env.DB_HOST;

const sslEnabled =
  String(process.env.DB_SSL || "").toLowerCase() === "true" ||
  String(process.env.DB_SSL || "").toLowerCase() === "1";

export default new DataSource(
  isPostgres
    ? {
        type: "postgres",
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
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
