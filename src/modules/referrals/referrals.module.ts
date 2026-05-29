import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEvent } from './entities/referral-event.entity';
import { ReferralLink } from './entities/referral-link.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralLink, ReferralEvent])],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [TypeOrmModule, ReferralsService],
})
export class ReferralsModule {}