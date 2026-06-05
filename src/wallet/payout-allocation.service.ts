import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { CashoutRequest } from './cashout-request.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { PayoutSource } from './payout-source.entity';

@Injectable()
export class PayoutAllocationService {
  private stripe?: Stripe;

  constructor(
    @InjectRepository(CashoutRequest)
    private readonly cashoutRepo: Repository<CashoutRequest>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,

    @InjectRepository(PayoutSource)
    private readonly payoutSourceRepo: Repository<PayoutSource>,
  ) {}

  private getStripe(): Stripe {
    const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

    if (!secretKey) {
      throw new BadRequestException('stripe_secret_key_missing');
    }

    if (!this.stripe) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover',
      });
    }

    return this.stripe;
  }

  async tryResolveFromRetryLineage(
    cashout: CashoutRequest,
    amountCents: number,
  ): Promise<{
    paymentIntentId: string;
    stripeChargeId: string;
    amountCents: number;
  } | null> {
    if (!cashout.retryOfCashoutId) {
      return null;
    }

    let cursorId: number | null = Number(cashout.retryOfCashoutId);

    while (Number.isFinite(cursorId) && cursorId > 0) {
      const priorCashout = await this.cashoutRepo.findOne({
        where: { id: cursorId },
      });

      if (!priorCashout) break;

      const priorSource = await this.payoutSourceRepo.findOne({
        where: { cashoutId: priorCashout.id },
        order: { id: 'DESC' },
      });

      if (priorSource) {
       const result = await this.payoutSourceRepo.manager.query(
  `
  SELECT COALESCE(SUM(pa."amountCents"), 0) AS total
  FROM payout_allocations pa
  JOIN payout_sources ps ON ps.id = pa."payoutSourceId"
  WHERE ps."stripeChargeId" = $1
  `,
  [priorSource.stripeChargeId],
);

const alreadyAllocated = Number(result?.[0]?.total || 0);

        const charge = await this.getStripe().charges.retrieve(
          priorSource.stripeChargeId,
        );

        const chargeAmount = Number(charge.amount || 0);

        if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
          throw new BadRequestException('source_charge_amount_invalid');
        }

        if (alreadyAllocated + amountCents <= chargeAmount) {
          return {
            paymentIntentId: priorSource.paymentIntentId,
            stripeChargeId: priorSource.stripeChargeId,
            amountCents,
          };
        }
      }

      cursorId = priorCashout.retryOfCashoutId
        ? Number(priorCashout.retryOfCashoutId)
        : null;
    }

    return null;
  }

  async resolveSingleSourceForCashout(cashoutId: number): Promise<{
    paymentIntentId: string;
    stripeChargeId: string;
    amountCents: number;
  }> {
    const cashout = await this.cashoutRepo.findOne({
      where: { id: cashoutId },
      relations: ['wallet'],
    });

    if (!cashout) {
      throw new BadRequestException('cashout_not_found');
    }

    if (!cashout.wallet) {
      throw new BadRequestException('cashout_wallet_missing');
    }

    const amountCents = Number(cashout.amountCents);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('invalid_cashout_amount');
    }

    const retryAllocation = await this.tryResolveFromRetryLineage(
      cashout,
      amountCents,
    );

    if (retryAllocation) {
      return retryAllocation;
    }

    const depositTxs = await this.txRepo.find({
      where: { walletId: cashout.walletId, type: 'deposit' },
      order: { id: 'DESC' },
    });

    for (const tx of depositTxs) {
      const depositRef = String((tx as any)?.depositRef || '').trim();

      const paymentIntentId = depositRef.startsWith('stripe:')
        ? depositRef.slice('stripe:'.length)
        : '';

      if (!paymentIntentId) continue;

      const paymentIntent = await this.getStripe().paymentIntents.retrieve(
        paymentIntentId,
      );

      if (paymentIntent.status !== 'succeeded') continue;
      const stripeChargeId = String(paymentIntent.latest_charge || '').trim();
      if (!stripeChargeId) continue;

      if (!stripeChargeId) continue;

      const charge = await this.getStripe().charges.retrieve(stripeChargeId);

      const result = await this.payoutSourceRepo.manager.query(
        `
        SELECT COALESCE(SUM(pa."amountCents"), 0) AS total
        FROM payout_allocations pa
        JOIN payout_sources ps ON ps.id = pa."payoutSourceId"
        WHERE ps."stripeChargeId" = $1
        `,
        [stripeChargeId],
      );

      const totalUsed = Number(result?.[0]?.total || 0);

      const chargeAmount = Number(charge.amount || 0);

      if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
        continue;
      }

      if (totalUsed + amountCents > chargeAmount) continue;

      return {
        paymentIntentId,
        stripeChargeId,
        amountCents,
      };
    }

        // DEV FALLBACK: reuse last known payout source if no deposit found
    const lastSource = await this.payoutSourceRepo.findOne({
      order: { id: 'DESC' },
    });

    if (lastSource) {
      return {
        paymentIntentId: lastSource.paymentIntentId,
        stripeChargeId: lastSource.stripeChargeId,
        amountCents,
      };
    }

    throw new BadRequestException('eligible_source_transaction_missing');
  }
}







