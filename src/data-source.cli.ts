import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// TypeORM CLI DataSource for TABZ
// OATH1-H: CLI must also be Postgres-only.
// synchronize stays OFF for migrations usage.

const rawUrl = String(process.env.DATABASE_URL || process.env.TYPEORM_URL || '').trim();
const hasPgUrl = rawUrl.length > 0;
const hasPgHost = String(process.env.DB_HOST || '').trim().length > 0;

if (!hasPgUrl && !hasPgHost) {
  throw new Error(
    'TABZ CLI blocked: Postgres config required (DATABASE_URL/TYPEORM_URL or DB_HOST). SQLite is forbidden.',
  );
}

let url = rawUrl;

if (!url) {
  const u = String(process.env.DB_USERNAME || '').trim();
  const p = String(process.env.DB_PASSWORD || '').trim();
  const h = String(process.env.DB_HOST || '').trim();
  const port = String(process.env.DB_PORT || '').trim();
  const db = String(process.env.DB_NAME || '').trim();

  const sslRaw = String(process.env.DB_SSL || 'true').toLowerCase();
  const sslMode =
    sslRaw === 'true' || sslRaw === '1' || sslRaw === 'require'
      ? '?sslmode=require'
      : '';

  if (!u || !p || !h || !port || !db) {
    throw new Error(
      'TABZ CLI blocked: incomplete Postgres DB_* config. Required: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME.',
    );
  }

  url =
    `postgresql://${encodeURIComponent(u)}:${encodeURIComponent(p)}` +
    `@${h}:${port}/${db}${sslMode}`;

  process.env.DATABASE_URL = url;
}

const normalizedUrl = url.toLowerCase();
if (
  normalizedUrl.startsWith('sqlite:') ||
  normalizedUrl.startsWith('file:') ||
  normalizedUrl.includes('sqlite')
) {
  throw new Error('TABZ CLI blocked: SQLite connection strings are forbidden by OATH1-H.');
}

export default new DataSource({
  type: 'postgres',
  url,
  ssl: { rejectUnauthorized: false },
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});