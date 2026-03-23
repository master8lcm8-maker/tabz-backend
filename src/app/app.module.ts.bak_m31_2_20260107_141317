// src/app/app.module.ts
import { Module } from '@nestjs/common';
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

// ✅ ADD
import { IdentityModule } from '../identity/identity.module';

// ✅ ADD (HEALTH)
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
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
