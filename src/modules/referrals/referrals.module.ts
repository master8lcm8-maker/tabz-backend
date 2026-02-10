import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralCode } from './referral-code.entity';
import { ReferralAttribution } from './referral-attribution.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralCode, ReferralAttribution])],
  providers: [ReferralsService],
  controllers: [ReferralsController],
  exports: [ReferralsService],
})
export class ReferralsModule {}