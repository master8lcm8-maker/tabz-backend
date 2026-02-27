// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { AccountDeletionModule } from '../modules/account-deletion/account-deletion.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dataSource from '../data-source';
import { ScheduleModule } from '@nestjs/schedule';

import { WalletModule } from '../wallet/wallet.module';
import { ProfileModule } from '../profile/profile.module';

import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { StoreItemsModule } from '../modules/store-items/store-items.module';
import { DevSeedModule } from '../dev-seed/dev-seed.module';

// ? ADD
import { VenuesModule } from '../modules/venues/venues.module';

// ? ADD
import { IdentityModule } from '../identity/identity.module';

// ? ADD (HEALTH)
import { HealthModule } from '../health/health.module';

// ? P3: Engagement runtime
import { EngagementModule } from '../modules/engagement/engagement.module';
import { PasswordResetModule } from '../modules/password-reset/password-reset.module';

// P3: Freeboard
import { FreeboardModule } from '../modules/freeboard/freeboard.module';

@Module({
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [AppController],
  imports: [
    AccountDeletionModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    // P3: Engagement
    EngagementModule,
    PasswordResetModule,

    // P3: Freeboard
    FreeboardModule,

    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
    }),    // DB: use the same single source of truth as TypeORM CLI/runtime (src/data-source.ts)
    // - If DATABASE_URL is set -> Postgres
    // - else -> SQLite
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...(dataSource.options as any),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    // Core modules
    UsersModule,
    AuthModule,
    WalletModule,
    StoreItemsModule,
    ProfileModule,

    // ? FV-17 � venues endpoints
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







