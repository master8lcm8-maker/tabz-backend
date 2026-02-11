import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ReferralCode } from './referral-code.entity';
import { ReferralAttribution } from './referral-attribution.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly codesRepo: Repository<ReferralCode>,

    @InjectRepository(ReferralAttribution)
    private readonly attrRepo: Repository<ReferralAttribution>,
  ) {}

  private generateCode(): string {
    // TABZ- + 6 chars
    const s = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    return `TABZ-${s}`;
  }

  async getOrCreateCode(inviterUserId: number): Promise<string> {
    const existing = await this.codesRepo.findOne({ where: { userId: inviterUserId } });
    if (existing?.code) return existing.code;

    // retry few times in case of rare collision
    for (let i = 0; i < 6; i++) {
      const code = this.generateCode();
      try {
        const row = this.codesRepo.create({ userId: inviterUserId, code });
        await this.codesRepo.save(row);
        return code;
      } catch {
        // collision on code or userId unique; loop handles code collision
      }
    }

    // last resort: deterministic-ish fallback
    const fallback = `TABZ-${String(inviterUserId).padStart(6, '0')}`;
    const row = this.codesRepo.create({ userId: inviterUserId, code: fallback });
    await this.codesRepo.save(row);
    return fallback;
  }

  async bindAtSignup(args: {
    invitedUserId: number;
    referralCode: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<{ bound: boolean; inviterUserId?: number }> {
    const code = String(args.referralCode || '').trim().toUpperCase();
    if (!code) return { bound: false };

    // one-time binding per invited user
    const already = await this.attrRepo.findOne({ where: { invitedUserId: args.invitedUserId } });
    if (already) return { bound: false, inviterUserId: already.inviterUserId };

    const inviter = await this.codesRepo.findOne({ where: { code } });
    if (!inviter) return { bound: false };

    // block self-referral
    if (inviter.userId === args.invitedUserId) return { bound: false };

    const row = this.attrRepo.create({
      invitedUserId: args.invitedUserId,
      inviterUserId: inviter.userId,
      code,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    });

    await this.attrRepo.save(row);
    return { bound: true, inviterUserId: inviter.userId };
  }
}