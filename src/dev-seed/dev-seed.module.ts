// src/dev-seed/dev-seed.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevSeedController } from './dev-seed.controller';
import { DevSeedGuard } from './dev-seed.guard';

import { Staff } from '../modules/staff/staff.entity';
import { Venue } from '../modules/venues/venue.entity';

import { ProfileModule } from '../profile/profile.module';
import { UsersModule } from '../modules/users/users.module';

// ✅ ADD
import { StoreItemsModule } from '../modules/store-items/store-items.module';

@Module({
  imports: [
    UsersModule,
    ProfileModule,
    // ✅ ADD
    StoreItemsModule,
    TypeOrmModule.forFeature([Staff, Venue]),
  ],
  controllers: [DevSeedController],
  providers: [DevSeedGuard],
})
export class DevSeedModule {}
