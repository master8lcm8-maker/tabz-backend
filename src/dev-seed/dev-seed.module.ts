// src/dev-seed/dev-seed.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevSeedController } from './dev-seed.controller';
import { Staff } from '../modules/staff/staff.entity';
import { Venue } from '../modules/venues/venue.entity';

// ✅ Profile support
import { ProfileModule } from '../profile/profile.module';

import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    UsersModule,

    // ✅ IMPORTANT: register both Staff + Venue so Staff#venue relation metadata exists
    TypeOrmModule.forFeature([Staff, Venue]),

    ProfileModule, // ✅ makes ProfileService injectable in DevSeedController
  ],
  controllers: [DevSeedController],
})
export class DevSeedModule {}
