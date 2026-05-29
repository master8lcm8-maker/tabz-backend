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

  private getReferralRewardPolicy(): {
    rewardPostingEnabled: false;
    maxRewardCents: number;
    allowedSignupEventType: 'signup';
    duplicateAttributionPolicy: string;
    selfReferralPolicy: string;
  } {
    return {
      rewardPostingEnabled: false,
      maxRewardCents: 0,
      allowedSignupEventType: 'signup',
      duplicateAttributionPolicy: 'block_duplicate_signup_attribution_per_referral_link',
      selfReferralPolicy: 'block_actor_user_id_equal_attributed_user_id',
    };
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
    const rewardPolicy = this.getReferralRewardPolicy();

    if (!Number.isFinite(rewardCents) || rewardCents < 0) {
      throw new BadRequestException('invalid_reward_cents');
    }

    if (rewardCents > rewardPolicy.maxRewardCents) {
      throw new BadRequestException('referral_rewards_disabled_record_only_policy');
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
        rewardPolicyStatus: 'record_only_rewards_disabled',
        rewardPostingEnabled: rewardPolicy.rewardPostingEnabled,
        maxRewardCents: rewardPolicy.maxRewardCents,
        walletLedgerRewardPosting: 'not_enabled_until_policy_and_anti_fraud_controls_are_proven',
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

    if (actorUserId !== null && actorUserId === attributedUserId) {
      throw new BadRequestException('self_referral_blocked');
    }

    const duplicateAttribution = await this.referralEventRepo.findOne({
      where: {
        referralLinkId: link.id,
        eventType: 'signup',
        attributedUserId,
      },
    });

    if (duplicateAttribution) {
      throw new BadRequestException('duplicate_referral_signup_attribution_blocked');
    }

    const rewardPolicy = this.getReferralRewardPolicy();
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
        rewardPolicyStatus: 'record_only_rewards_disabled',
        rewardPostingEnabled: rewardPolicy.rewardPostingEnabled,
        duplicateAttributionPolicy: rewardPolicy.duplicateAttributionPolicy,
        selfReferralPolicy: rewardPolicy.selfReferralPolicy,
        rewardCentsTrackedOnly: Number(link.rewardCents ?? 0),
      },
    });

    link.signupsCount = Number(link.signupsCount ?? 0) + 1;

    const saved = await this.referralEventRepo.save(event);
    await this.referralLinkRepo.save(link);

    return saved;
  }
  private normalizeAdminLimit(input: unknown, fallback = 25, max = 100): number {
    const n = Number(input ?? fallback);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.trunc(n), max);
  }

  async adminGetReferralOverview(): Promise<{
    totalLinks: number;
    activeLinks: number;
    pausedLinks: number;
    disabledLinks: number;
    totalEvents: number;
    clickEvents: number;
    signupEvents: number;
    conversionEvents: number;
    rewardPostingEnabled: false;
    policyStatus: string;
  }> {
    const [
      totalLinks,
      activeLinks,
      pausedLinks,
      disabledLinks,
      totalEvents,
      clickEvents,
      signupEvents,
      conversionEvents,
    ] = await Promise.all([
      this.referralLinkRepo.count(),
      this.referralLinkRepo.count({ where: { status: 'active' } }),
      this.referralLinkRepo.count({ where: { status: 'paused' } }),
      this.referralLinkRepo.count({ where: { status: 'disabled' } }),
      this.referralEventRepo.count(),
      this.referralEventRepo.count({ where: { eventType: 'click' } }),
      this.referralEventRepo.count({ where: { eventType: 'signup' } }),
      this.referralEventRepo.count({ where: { eventType: 'conversion' } }),
    ]);

    return {
      totalLinks,
      activeLinks,
      pausedLinks,
      disabledLinks,
      totalEvents,
      clickEvents,
      signupEvents,
      conversionEvents,
      rewardPostingEnabled: false,
      policyStatus: 'record_only_admin_visibility_no_wallet_ledger_rewards',
    };
  }

  async adminListReferralLinks(input?: {
    limit?: number;
    status?: string | null;
    ownerUserId?: number | null;
  }): Promise<{ total: number; items: ReferralLink[]; rewardPostingEnabled: false }> {
    const limit = this.normalizeAdminLimit(input?.limit);
    const where: Record<string, unknown> = {};

    const status = input?.status == null ? null : String(input.status).trim();
    if (status) {
      if (!['active', 'paused', 'disabled'].includes(status)) {
        throw new BadRequestException('invalid_referral_status');
      }
      where.status = status;
    }

    if (input?.ownerUserId !== null && input?.ownerUserId !== undefined) {
      where.ownerUserId = this.assertPositiveInt(input.ownerUserId, 'invalid_owner_user_id');
    }

    const [items, total] = await this.referralLinkRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      take: limit,
    });

    return {
      total,
      items,
      rewardPostingEnabled: false,
    };
  }

  async adminListReferralEvents(input?: {
    limit?: number;
    referralLinkId?: number | null;
    eventType?: string | null;
    attributedUserId?: number | null;
  }): Promise<{ total: number; items: ReferralEvent[]; rewardPostingEnabled: false }> {
    const limit = this.normalizeAdminLimit(input?.limit);
    const where: Record<string, unknown> = {};

    if (input?.referralLinkId !== null && input?.referralLinkId !== undefined) {
      where.referralLinkId = this.assertPositiveInt(input.referralLinkId, 'invalid_referral_link_id');
    }

    const eventType = input?.eventType == null ? null : String(input.eventType).trim();
    if (eventType) {
      if (!['click', 'signup', 'conversion'].includes(eventType)) {
        throw new BadRequestException('invalid_referral_event_type');
      }
      where.eventType = eventType;
    }

    if (input?.attributedUserId !== null && input?.attributedUserId !== undefined) {
      where.attributedUserId = this.assertPositiveInt(input.attributedUserId, 'invalid_attributed_user_id');
    }

    const [items, total] = await this.referralEventRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      take: limit,
    });

    return {
      total,
      items,
      rewardPostingEnabled: false,
    };
  }
}
