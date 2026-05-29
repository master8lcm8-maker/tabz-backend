import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionBillingEvent } from './entities/promotion-billing-event.entity';
import { PromotionRevenueEvent } from './entities/promotion-revenue-event.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(PromotionBillingEvent)
    private readonly billingRepo: Repository<PromotionBillingEvent>,
    @InjectRepository(PromotionRevenueEvent)
    private readonly revenueRepo: Repository<PromotionRevenueEvent>,
  ) {}

  async createPromotion(input: {
    ownerUserId: number;
    targetType: string;
    targetId?: number | null;
    title: string;
    description?: string | null;
    listedPriceCents?: number;
    platformFeePercent?: number;
    budgetCents?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<Promotion> {
    const ownerUserId = Number(input.ownerUserId);
    const title = String(input.title ?? '').trim();
    const targetType = String(input.targetType ?? '').trim();
    const listedPriceCents = Number(input.listedPriceCents ?? 0);
    const platformFeePercent = Number(input.platformFeePercent ?? 10);
    const budgetCents = Number(input.budgetCents ?? 0);

    if (!Number.isFinite(ownerUserId) || ownerUserId <= 0) {
      throw new BadRequestException('owner_user_id_required');
    }

    if (!targetType) {
      throw new BadRequestException('target_type_required');
    }

    if (!title) {
      throw new BadRequestException('promotion_title_required');
    }

    if (!Number.isFinite(listedPriceCents) || listedPriceCents < 0) {
      throw new BadRequestException('invalid_listed_price_cents');
    }

    if (!Number.isFinite(platformFeePercent) || platformFeePercent < 0 || platformFeePercent > 100) {
      throw new BadRequestException('invalid_platform_fee_percent');
    }

    if (!Number.isFinite(budgetCents) || budgetCents < 0) {
      throw new BadRequestException('invalid_budget_cents');
    }

    const platformFeeCents = Math.floor((listedPriceCents * platformFeePercent) / 100);
    const merchantReceivableCents = listedPriceCents - platformFeeCents;

    const promotion = this.promotionRepo.create({
      ownerUserId,
      targetType,
      targetId: input.targetId == null ? null : Number(input.targetId),
      title,
      description: input.description ?? null,
      status: 'draft',
      listedPriceCents,
      platformFeePercent,
      platformFeeCents,
      merchantReceivableCents,
      budgetCents,
      spentCents: 0,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      metadata: {
        ...(input.metadata ?? {}),
        phase15Runtime: 'promotion_created_no_wallet_mutation',
        listedPriceRule: 'platform_fee_comes_from_listed_price',
      },
    });

    return this.promotionRepo.save(promotion);
  }

  async listPromotions(): Promise<Promotion[]> {
    return this.promotionRepo.find({ order: { id: 'DESC' } });
  }

  async getPromotion(id: number): Promise<Promotion> {
    const promotionId = Number(id);

    if (!Number.isFinite(promotionId) || promotionId <= 0) {
      throw new BadRequestException('promotion_id_required');
    }

    const promotion = await this.promotionRepo.findOne({ where: { id: promotionId } });

    if (!promotion) {
      throw new NotFoundException('promotion_not_found');
    }

    return promotion;
  }

  async approvePromotion(id: number): Promise<Promotion> {
    const promotion = await this.getPromotion(id);

    if (promotion.status === 'rejected' || promotion.status === 'canceled') {
      throw new BadRequestException('promotion_not_approvable');
    }

    promotion.status = 'approved';
    promotion.approvedAt = new Date();
    promotion.rejectedAt = null;
    promotion.rejectionReason = null;

    return this.promotionRepo.save(promotion);
  }

  async rejectPromotion(id: number, reason?: string): Promise<Promotion> {
    const promotion = await this.getPromotion(id);

    if (promotion.status === 'active' || promotion.status === 'completed') {
      throw new BadRequestException('promotion_not_rejectable');
    }

    promotion.status = 'rejected';
    promotion.rejectedAt = new Date();
    promotion.rejectionReason = String(reason ?? 'promotion_rejected').trim();

    return this.promotionRepo.save(promotion);
  }

  async activatePromotion(id: number): Promise<Promotion> {
    const promotion = await this.getPromotion(id);

    if (promotion.status !== 'approved') {
      throw new BadRequestException('promotion_must_be_approved_before_activation');
    }

    promotion.status = 'active';

    return this.promotionRepo.save(promotion);
  }

  async completePromotion(id: number): Promise<Promotion> {
    const promotion = await this.getPromotion(id);

    if (promotion.status !== 'active' && promotion.status !== 'approved') {
      throw new BadRequestException('promotion_not_completable');
    }

    promotion.status = 'completed';

    return this.promotionRepo.save(promotion);
  }

  async cancelPromotion(id: number): Promise<Promotion> {
    const promotion = await this.getPromotion(id);

    if (promotion.status === 'completed') {
      throw new BadRequestException('completed_promotion_not_cancelable');
    }

    promotion.status = 'canceled';

    return this.promotionRepo.save(promotion);
  }

  async recordBillingEvent(input: {
    promotionId: number;
    eventType: string;
    amountCents: number;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<PromotionBillingEvent> {
    const promotion = await this.getPromotion(input.promotionId);
    const amountCents = Number(input.amountCents);
    const eventType = String(input.eventType ?? '').trim();

    if (!eventType) {
      throw new BadRequestException('billing_event_type_required');
    }

    if (!Number.isFinite(amountCents) || amountCents < 0) {
      throw new BadRequestException('invalid_billing_amount_cents');
    }

    if (input.idempotencyKey) {
      const existing = await this.billingRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) return existing;
    }

    const platformFeeCents = Math.floor((amountCents * promotion.platformFeePercent) / 100);
    const merchantReceivableCents = amountCents - platformFeeCents;

    const event = this.billingRepo.create({
      promotionId: promotion.id,
      eventType,
      amountCents,
      platformFeeCents,
      merchantReceivableCents,
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        phase15Runtime: 'promotion_billing_record_only_no_wallet_mutation',
        listedPriceRule: 'platform_fee_comes_from_listed_price',
      },
    });

    return this.billingRepo.save(event);
  }

  async recordRevenueEvent(input: {
    promotionId: number;
    sourceType: string;
    sourceId?: number | null;
    grossCents: number;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<PromotionRevenueEvent> {
    const promotion = await this.getPromotion(input.promotionId);
    const grossCents = Number(input.grossCents);
    const sourceType = String(input.sourceType ?? '').trim();

    if (!sourceType) {
      throw new BadRequestException('revenue_source_type_required');
    }

    if (!Number.isFinite(grossCents) || grossCents < 0) {
      throw new BadRequestException('invalid_revenue_gross_cents');
    }

    if (input.idempotencyKey) {
      const existing = await this.revenueRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) return existing;
    }

    const platformFeeCents = Math.floor((grossCents * promotion.platformFeePercent) / 100);
    const merchantReceivableCents = grossCents - platformFeeCents;

    const event = this.revenueRepo.create({
      promotionId: promotion.id,
      sourceType,
      sourceId: input.sourceId == null ? null : Number(input.sourceId),
      grossCents,
      platformFeeCents,
      merchantReceivableCents,
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        phase15Runtime: 'promotion_revenue_record_only_no_wallet_mutation',
        listedPriceRule: 'platform_fee_comes_from_listed_price',
      },
    });

    return this.revenueRepo.save(event);
  }
}