// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WalletModule } from '../wallet/wallet.module';
import { ProfileModule } from '../profile/profile.module'; // ✅ ADDED

import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { StoreItemsModule } from '../modules/store-items/store-items.module';
import { DevSeedModule } from '../dev-seed/dev-seed.module';

// ✅ ADD
import { IdentityModule } from '../identity/identity.module';

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
    AuthModule,        // ✅ enables /auth/login and registers jwt strategy
    WalletModule,
    StoreItemsModule,  // ✅ enables /store-items/*
    ProfileModule,     // ✅ ENABLES profiles table + DI

    // Identity
    IdentityModule,

    // Dev tools
    DevSeedModule,     // ✅ enables /dev-seed/*
  ],
})
export class AppModule {}
