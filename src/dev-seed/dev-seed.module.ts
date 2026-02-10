import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevSeedController } from './dev-seed.controller';

import { Staff } from '../modules/staff/staff.entity';
import { Venue } from '../modules/venues/venue.entity';
import { ReferralAttribution } from '../modules/referrals/referral-attribution.entity';

import { UsersModule } from '../modules/users/users.module';
import { ProfileModule } from '../profile/profile.module';
import { StoreItemsModule } from '../modules/store-items/store-items.module';

@Module({
  imports: [
    UsersModule,
    ProfileModule,
    StoreItemsModule,

    TypeOrmModule.forFeature([
      Staff,
      Venue,
      ReferralAttribution,
    ]),
  ],
  controllers: [DevSeedController],
})
export class DevSeedModule {}