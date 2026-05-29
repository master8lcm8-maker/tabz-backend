import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEvent } from './entities/referral-event.entity';
import { ReferralLink } from './entities/referral-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralLink, ReferralEvent])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ReferralsModule {}