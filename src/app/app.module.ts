// src/app/app.module.ts
import { Module } from '@nestjs/common';

import { AccountDeletionModule } from '../modules/account-deletion/account-deletion.module';
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
      // 🔒 OATH1-H: backend runtime must be Postgres-only.
      // Allowed config sources:
      //   1) DATABASE_URL / TYPEORM_URL
      //   2) DB_HOST + DB_PORT + DB_USERNAME + DB_PASSWORD + DB_NAME
      const rawUrl = String(process.env.DATABASE_URL || process.env.TYPEORM_URL || '').trim();
      const hasPgUrl = rawUrl.length > 0;
      const hasPgHost = String(process.env.DB_HOST || '').trim().length > 0;

      if (!hasPgUrl && !hasPgHost) {
        throw new Error(
          'TABZ boot blocked: Postgres config required (DATABASE_URL/TYPEORM_URL or DB_HOST). SQLite is forbidden.',
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
            'TABZ boot blocked: incomplete Postgres DB_* config. Required: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME.',
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
        throw new Error('TABZ boot blocked: SQLite connection strings are forbidden by OATH1-H.');
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
    AccountDeletionModule,
  ],
})
export class AppModule {}