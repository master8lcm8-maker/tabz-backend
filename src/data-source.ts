import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";

const root = __dirname.replace(/\\/g, "/");

// ===== HARD SAFETY GUARDS (NO SQLITE IN PROD) =====
//
// If DATABASE_URL exists, assume Postgres.
// Otherwise if DB_HOST exists, assume Postgres.
// Otherwise fall back to local SQLite dev file.
//
// BUT: In production/DO we NEVER allow silent SQLite fallback.
// If Postgres env isn't present in prod, we crash fast with a clear error.
//
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasDbHost = !!process.env.DB_HOST;
const usePostgres = hasDatabaseUrl || hasDbHost;

// Best-effort "prod/DO" detection (any one of these implies "do not fall back")
const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
const isProd = nodeEnv === "production";

// DigitalOcean App Platform commonly sets one of these
const isDigitalOcean =
  !!process.env.DIGITALOCEAN_APP_ID ||
  !!process.env.DIGITALOCEAN_APP_NAME ||
  !!process.env.DIGITALOCEAN_APP_UUID ||
  !!process.env.DO_APP_ID ||
  !!process.env.DO_APP_NAME;

// If you're on DO/prod and env didn't load -> fail fast (never SQLite)
if ((isProd || isDigitalOcean) && !usePostgres) {
  throw new Error(
    `FATAL_DB_CONFIG: Postgres env not detected (DATABASE_URL/DB_HOST missing) while NODE_ENV=${process.env.NODE_ENV}. Refusing SQLite fallback.`
  );
}

// If DATABASE_URL is present, validate it is a postgres URL (prevent poisoned values)
if (hasDatabaseUrl) {
  const u = String(process.env.DATABASE_URL || "").trim();
  if (!/^postgres(ql)?:\/\//i.test(u)) {
    throw new Error(
      `FATAL_DB_CONFIG: DATABASE_URL is present but not a postgres URL. Got: ${u.slice(0, 40)}...`
    );
  }
}

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
        // DEV ONLY fallback (explicit). In prod/DO this is blocked by guard above.
        type: "sqlite",
        database: process.env.SQLITE_DB_PATH || "tabz-dev.sqlite",
        entities: [root + "/**/*.entity.ts", root + "/**/*.entity.js"],
        migrations: [root + "/migrations/*.ts", root + "/migrations/*.js"],
        synchronize: false,
        migrationsRun: true,
      }
);