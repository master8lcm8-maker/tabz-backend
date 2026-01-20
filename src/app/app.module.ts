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

import { VenuesModule } from '../modules/venues/venues.module';
import { IdentityModule } from '../identity/identity.module';
import { HealthModule } from '../health/health.module';
import { DrinksModule } from '../modules/drinks/drinks.module';
@Module({
  providers: [AppService],
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot((() => {
      const env = String(process.env.NODE_ENV || '').toLowerCase();
      const isProd = env === 'production';

      if (isProd) {
        // 1) Prefer DATABASE_URL if provided
        let url = process.env.DATABASE_URL;

        // 2) If missing, build it from DB_* parts
        if (!url) {
          const u = process.env.DB_USERNAME;
          const p = process.env.DB_PASSWORD;
          const h = process.env.DB_HOST;
          const port = process.env.DB_PORT;
          const db = process.env.DB_NAME;

          const sslRaw = String(process.env.DB_SSL || 'true').toLowerCase();
          const sslMode =
            (sslRaw === 'true' || sslRaw === '1' || sslRaw === 'require')
              ? '?sslmode=require'
              : '';

          if (u && p && h && port && db) {
            url =
              `postgresql://${encodeURIComponent(u)}:${encodeURIComponent(p)}` +
              `@${h}:${port}/${db}${sslMode}`;
            process.env.DATABASE_URL = url; // keep for anything else that reads it
          } else {
            throw new Error(
              'DATABASE_URL or DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME is required in production',
            );
          }
        }

        // Optional debug (NO passwords)
        if (process.env.DEBUG_DB === '1') {
          try {
            const safe = new URL(url);
            console.log('[DEBUG_DB] using postgres', {
              host: safe.hostname,
              port: safe.port,
              db: safe.pathname?.replace('/', ''),
              sslmode: safe.searchParams.get('sslmode'),
            });
          } catch {
            console.log('[DEBUG_DB] using postgres (unable to parse url)');
          }
        }

        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: false,
          ssl: { rejectUnauthorized: false },
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

    UsersModule,
    AuthModule,
    WalletModule,
    StoreItemsModule,
    ProfileModule,
    CreditsModule,
    VenuesModule,
    IdentityModule,
    HealthModule,
    DrinksModule,
    DevSeedModule,
  ],
})
export class AppModule {}

