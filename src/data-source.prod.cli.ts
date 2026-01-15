import "reflect-metadata";
import { DataSource } from "typeorm";
console.log("TABZ_DB_DEBUG", {
  DATABASE_URL: process.env.DATABASE_URL,
  TYPEORM_URL: process.env.TYPEORM_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_NAME: process.env.DB_NAME,
});


// Postgres CLI DataSource for PROD migrations
// Uses DATABASE_URL (preferred) or individual DB_* vars.
// ONLY used by TypeORM CLI scripts (db:run:prod, db:show:prod).
const url = process.env.DATABASE_URL || process.env.TYPEORM_URL;

export default new DataSource(
  url
    ? {
        type: "postgres",
        url,
        entities: ["dist/**/*.entity.js"],
        migrations: ["dist/migrations/*.js"],
        synchronize: false,
        logging: false,
        ssl: { rejectUnauthorized: false },
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
        ssl: { rejectUnauthorized: false },
      }
);

