// src/app/app.module.ts
import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreditsModule } from '../modules/credits/credits.module';
import { WalletModule } from '../wallet/wallet.module';
import { ProfileModule } from '../profile/profile.module';

import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { StoreItemsModule } from '../modules/store-items/store-items.module';
import { DevSeedModule } from '../dev-seed/dev-seed.module';

// âœ… ADD
import { VenuesModule } from '../modules/venues/venues.module';

// âœ… ADD
import { IdentityModule } from '../identity/identity.module';

// âœ… ADD (HEALTH)
import { HealthModule } from '../health/health.module';

@Module({
  providers: [AppService],
  controllers: [AppController],
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // LOCAL DEV: SQLITE ONLY
    TypeOrmModule.forRoot((() => {
      const env = String(process.env.NODE_ENV || '').toLowerCase();
      const isProd = env === 'production';
      const dbUrl = process.env.DATABASE_URL;

      if (isProd) {
        if (!dbUrl) {
          // Hard fail in production if DATABASE_URL is missing
          const sslRaw = (process.env.DB_SSL || '').toLowerCase();
const sslMode = (sslRaw -eq 'true' -or sslRaw -eq '1' -or sslRaw -eq 'require') ? '?sslmode=require' : '';

if (!process.env.DATABASE_URL) {
  const u = process.env.DB_USERNAME;
  const p = process.env.DB_PASSWORD;
  const h = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const db = process.env.DB_NAME;

  if (u && p && h && port && db) {
    process.env.DATABASE_URL =
      postgresql:// +
      ${encodeURIComponent(u)}:@ +
      ${h}:/;
  } else {
    throw new Error('DATABASE_URL or DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME is required in production');
  }
}
        }

        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: false,
          // Most managed Postgres providers require SSL
          ssl: String(process.env.DB_SSL || 'true').toLowerCase() === 'true'
            ? { rejectUnauthorized: false }
            : false,
        } as any;
      }

      // DEV default: sqlite
      return {
        type: 'sqlite',
        database: process.env.SQLITE_PATH || 'tabz-dev.sqlite',
        autoLoadEntities: true,
        synchronize: true,
      } as any;
    })()),

    // Core modules
    UsersModule,
    AuthModule,
    WalletModule,
    StoreItemsModule,
    ProfileModule,
    CreditsModule,

    // âœ… FV-17 â€” venues endpoints
    VenuesModule,

    // Identity
    IdentityModule,

    // Health (liveness / readiness)
    HealthModule,

    // Dev tools
    DevSeedModule,
  ],
})
export class AppModule {}


