// src/app/app.module.ts
import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WalletModule } from '../wallet/wallet.module';
import { ProfileModule } from '../profile/profile.module';

import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { StoreItemsModule } from '../modules/store-items/store-items.module';
import { DevSeedModule } from '../dev-seed/dev-seed.module';

// ✅ ADD
import { VenuesModule } from '../modules/venues/venues.module';
import { IdentityModule } from '../identity/identity.module';

// health
import { HealthModule } from '../health/health.module';

// ⭐ from P3
import { EngagementModule } from '../modules/engagement/engagement.module';

@Module({
  providers: [AppService],
  controllers: [AppController],
  imports: [
    // ⭐ from P3
    EngagementModule,

    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // LOCAL DEV: SQLITE ONLY
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'tabz-dev.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),

    // Core modules
    UsersModule,
    AuthModule,
    WalletModule,
    StoreItemsModule,
    ProfileModule,

    // ✅ FV-17 — venues endpoints
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
