import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReferralCode } from './entities/referral-code.entity';
import { ReferralAttribution } from './entities/referral-attribution.entity';
import {
  ReferralReward,
  ReferralRewardStatus,
} from './entities/referral-reward.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepo: Repository<ReferralCode>,

    @InjectRepository(ReferralAttribution)
    private readonly attributionRepo: Repository<ReferralAttribution>,

    @InjectRepository(ReferralReward)
    private readonly rewardRepo: Repository<ReferralReward>,
  ) {}

  /**
   * Generate a referral code for a user
   */
  async createReferralCode(ownerUserId: string): Promise<ReferralCode> {
    const code = this.generateCode();

    const referral = this.referralCodeRepo.create({
      ownerUserId,
      code,
      isActive: true,
    });

    return this.referralCodeRepo.save(referral);
  }

  /**
   * Resolve a referral code
   */
  async findCode(code: string): Promise<ReferralCode | null> {
    return this.referralCodeRepo.findOne({
      where: { code, isActive: true },
    });
  }

  /**
   * Attribute a new user to a referral
   */
  async createAttribution(
    referralCodeId: string,
    referrerUserId: string,
    referredUserId: string,
    codeSnapshot: string,
  ): Promise<ReferralAttribution> {
    const attribution = this.attributionRepo.create({
      referralCodeId,
      referrerUserId,
      referredUserId,
      referralCodeSnapshot: codeSnapshot,
      attributedAt: new Date(),
      isQualified: false,
    });

    return this.attributionRepo.save(attribution);
  }

  /**
   * Mark referral qualified after first valid action
   */
  async qualifyReferral(
    attributionId: string,
  ): Promise<ReferralAttribution | null> {
    const attribution = await this.attributionRepo.findOne({
      where: { id: attributionId },
    });

    if (!attribution) return null;

    attribution.isQualified = true;
    attribution.qualifiedAt = new Date();

    return this.attributionRepo.save(attribution);
  }

  /**
   * Create reward record (wallet credit handled elsewhere)
   */
  async createReward(
    attributionId: string,
    beneficiaryUserId: string,
    amountMinor: number,
  ): Promise<ReferralReward> {
    const reward = this.rewardRepo.create({
      attributionId,
      beneficiaryUserId,
      amountMinor,
      currencyCode: 'USD',
      status: ReferralRewardStatus.PENDING,
    });

    return this.rewardRepo.save(reward);
  }

  /**
   * Internal referral code generator
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }
}