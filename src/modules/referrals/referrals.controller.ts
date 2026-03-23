import { Controller, Post, Body, Param } from '@nestjs/common';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /**
   * Create referral code for user
   */
  @Post('code/:userId')
  async createCode(@Param('userId') userId: string) {
    return this.referralsService.createReferralCode(userId);
  }

  /**
   * Attribute referral during registration
   */
  @Post('attribute')
  async attribute(@Body() body: any) {
    const { referralCodeId, referrerUserId, referredUserId, code } = body;

    return this.referralsService.createAttribution(
      referralCodeId,
      referrerUserId,
      referredUserId,
      code,
    );
  }

  /**
   * Mark referral as qualified
   */
  @Post('qualify/:attributionId')
  async qualify(@Param('attributionId') attributionId: string) {
    return this.referralsService.qualifyReferral(attributionId);
  }

  /**
   * Create reward
   */
  @Post('reward')
  async reward(@Body() body: any) {
    const { attributionId, beneficiaryUserId, amountMinor } = body;

    return this.referralsService.createReward(
      attributionId,
      beneficiaryUserId,
      amountMinor,
    );
  }
}