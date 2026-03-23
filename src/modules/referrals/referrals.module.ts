import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReferralCode } from './entities/referral-code.entity';
import { ReferralAttribution } from './entities/referral-attribution.entity';
import { ReferralReward } from './entities/referral-reward.entity';

import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralCode,
      ReferralAttribution,
      ReferralReward,
    ]),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}