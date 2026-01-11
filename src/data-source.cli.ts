import "reflect-metadata";
import { DataSource } from "typeorm";

// TypeORM CLI DataSource for TABZ
// Mirrors AppModule runtime config (SQLite dev db).
// NOTE: synchronize should be OFF for migrations usage.
export default new DataSource({
  type: "sqlite",
  database: "tabz-dev.sqlite",
  // IMPORTANT: CLI needs explicit globs (autoLoadEntities is Nest-only)
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
  logging: false,
});
