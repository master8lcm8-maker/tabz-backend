import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralEvent } from './entities/referral-event.entity';
import { ReferralLink } from './entities/referral-link.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralLink)
    private readonly referralLinkRepo: Repository<ReferralLink>,

    @InjectRepository(ReferralEvent)
    private readonly referralEventRepo: Repository<ReferralEvent>,
  ) {}

  private assertPositiveInt(value: unknown, code: string): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException(code);
    }
    return n;
  }

  private normalizeCode(input: unknown): string {
    const code = String(input ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 64);

    if (!code) {
      throw new BadRequestException('referral_code_required');
    }

    return code;
  }

  async createReferralLink(input: {
    ownerUserId: number;
    code: string;
    targetType?: string | null;
    targetId?: number | null;
    rewardCents?: number;
    metadata?: Record<string, unknown> | null;
  }): Promise<ReferralLink> {
    const ownerUserId = this.assertPositiveInt(input?.ownerUserId, 'owner_user_id_required');
    const code = this.normalizeCode(input?.code);
    const rewardCents = Number(input?.rewardCents ?? 0);

    if (!Number.isFinite(rewardCents) || rewardCents < 0) {
      throw new BadRequestException('invalid_reward_cents');
    }

    const existing = await this.referralLinkRepo.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('referral_code_already_exists');
    }

    const targetType = input?.targetType == null ? null : String(input.targetType).trim() || null;
    const targetId = input?.targetId == null ? null : Number(input.targetId);

    if (targetId !== null && (!Number.isFinite(targetId) || targetId <= 0)) {
      throw new BadRequestException('invalid_target_id');
    }

    const link = this.referralLinkRepo.create({
      ownerUserId,
      code,
      status: 'active',
      targetType,
      targetId,
      clicksCount: 0,
      signupsCount: 0,
      conversionsCount: 0,
      rewardCents,
      metadata: {
        ...(input?.metadata ?? {}),
        phase26Runtime: 'referral_link_created_record_only_no_wallet_mutation',
        walletLedgerRewardPosting: 'not_enabled_until_referral_events_proven',
      },
    });

    return this.referralLinkRepo.save(link);
  }

  async resolveReferralLink(codeInput: string): Promise<ReferralLink> {
    const code = this.normalizeCode(codeInput);

    const link = await this.referralLinkRepo.findOne({ where: { code } });
    if (!link || link.status !== 'active') {
      throw new NotFoundException('referral_link_not_found');
    }

    return link;
  }

  async recordClick(input: {
    code: string;
    actorUserId?: number | null;
    ipHash?: string | null;
    userAgentHash?: string | null;
    sourceUrl?: string | null;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<ReferralEvent> {
    const link = await this.resolveReferralLink(input?.code);
    const idempotencyKey = input?.idempotencyKey ? String(input.idempotencyKey).trim() : null;

    if (idempotencyKey) {
      const existing = await this.referralEventRepo.findOne({ where: { idempotencyKey } });
      if (existing) return existing;
    }

    const actorUserId = input?.actorUserId == null ? null : Number(input.actorUserId);
    if (actorUserId !== null && (!Number.isFinite(actorUserId) || actorUserId <= 0)) {
      throw new BadRequestException('invalid_actor_user_id');
    }

    const event = this.referralEventRepo.create({
      referralLinkId: link.id,
      eventType: 'click',
      actorUserId,
      ipHash: input?.ipHash ?? null,
      userAgentHash: input?.userAgentHash ?? null,
      sourceUrl: input?.sourceUrl ?? null,
      attributedUserId: null,
      idempotencyKey,
      metadata: {
        ...(input?.metadata ?? {}),
        phase26Runtime: 'referral_click_record_only_no_wallet_mutation',
      },
    });

    link.clicksCount = Number(link.clicksCount ?? 0) + 1;

    const saved = await this.referralEventRepo.save(event);
    await this.referralLinkRepo.save(link);

    return saved;
  }

  async recordSignup(input: {
    code: string;
    attributedUserId: number;
    actorUserId?: number | null;
    ipHash?: string | null;
    userAgentHash?: string | null;
    sourceUrl?: string | null;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<ReferralEvent> {
    const link = await this.resolveReferralLink(input?.code);
    const attributedUserId = this.assertPositiveInt(input?.attributedUserId, 'attributed_user_id_required');
    const idempotencyKey = input?.idempotencyKey ? String(input.idempotencyKey).trim() : null;

    if (idempotencyKey) {
      const existing = await this.referralEventRepo.findOne({ where: { idempotencyKey } });
      if (existing) return existing;
    }

    const actorUserId = input?.actorUserId == null ? null : Number(input.actorUserId);
    if (actorUserId !== null && (!Number.isFinite(actorUserId) || actorUserId <= 0)) {
      throw new BadRequestException('invalid_actor_user_id');
    }

    const event = this.referralEventRepo.create({
      referralLinkId: link.id,
      eventType: 'signup',
      actorUserId,
      ipHash: input?.ipHash ?? null,
      userAgentHash: input?.userAgentHash ?? null,
      sourceUrl: input?.sourceUrl ?? null,
      attributedUserId,
      idempotencyKey,
      metadata: {
        ...(input?.metadata ?? {}),
        phase26Runtime: 'referral_signup_record_only_no_wallet_mutation',
        rewardCentsTrackedOnly: Number(link.rewardCents ?? 0),
      },
    });

    link.signupsCount = Number(link.signupsCount ?? 0) + 1;

    const saved = await this.referralEventRepo.save(event);
    await this.referralLinkRepo.save(link);

    return saved;
  }
}