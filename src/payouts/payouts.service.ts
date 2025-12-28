import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout } from './payout.entity';
import { Wallet } from '../wallet/wallet.entity';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async createPayout(userId: number, amountCents: number) {
    throw new BadRequestException(
      'Payouts are deprecated. Use /wallet/cashout (ledger-safe).',
    );

    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (amountCents <= 0)
      throw new BadRequestException('Amount must be positive');

    if (wallet.cashoutAvailableCents < amountCents)
      throw new BadRequestException('Insufficient cashout available balance');

    wallet.cashoutAvailableCents -= amountCents;
    await this.walletRepo.save(wallet);

    const payout = this.payoutRepo.create({
      walletId: wallet.id,
      amountCents,
      status: 'PENDING',
      failureReason: null,
      destinationLast4: '9012',
    });

    const saved = await this.payoutRepo.save(payout);

    await this.runMockPayoutEngine(saved.id);

    return this.payoutRepo.findOne({ where: { id: saved.id } });
  }

  async cancelPayout(id: number, userId: number) {
    throw new BadRequestException(
      'Payouts are deprecated. Use /wallet/cashout (ledger-safe).',
    );

    const payout = await this.payoutRepo.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');

    const wallet = await this.walletRepo.findOne({
      where: { id: payout.walletId },
    });
    if (!wallet || wallet.userId !== userId)
      throw new NotFoundException('Payout not found');

    if (payout.status !== 'PENDING')
      throw new BadRequestException('Only pending payouts can be cancelled');

    payout.status = 'FAILED';
    payout.failureReason = 'Cancelled by owner';
    await this.payoutRepo.save(payout);

    wallet.cashoutAvailableCents += payout.amountCents;
    await this.walletRepo.save(wallet);

    return payout;
  }

  async retryPayout(id: number, userId: number) {
    throw new BadRequestException(
      'Payouts are deprecated. Use /wallet/cashout (ledger-safe).',
    );

    const failed = await this.payoutRepo.findOne({ where: { id } });
    if (!failed) throw new NotFoundException('Payout not found');

    const wallet = await this.walletRepo.findOne({
      where: { id: failed.walletId },
    });
    if (!wallet || wallet.userId !== userId)
      throw new NotFoundException('Payout not found');

    if (failed.status !== 'FAILED')
      throw new BadRequestException('Only failed payouts can be retried');

    const newPayout = this.payoutRepo.create({
      walletId: wallet.id,
      amountCents: failed.amountCents,
      status: 'PENDING',
      failureReason: null,
      destinationLast4: failed.destinationLast4 ?? '9012',
    });

    const saved = await this.payoutRepo.save(newPayout);

    await this.runMockPayoutEngine(saved.id);

    return this.payoutRepo.findOne({ where: { id } });
  }

  async getPayoutsForUser(userId: number) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) return [];
    return this.payoutRepo.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
  }

  private async runMockPayoutEngine(id: number) {
    // ✅ RULE A ENFORCEMENT:
    // No status transition that affects money is allowed without a ledger row
    // in the same transaction. Payouts have no ledger, so this engine is disabled.
    throw new BadRequestException(
      'Payout engine disabled: payouts cannot change status without ledger entries. Use /wallet/cashout.',
    );

    const payout = await this.payoutRepo.findOne({ where: { id } });
    if (!payout || payout.status !== 'PENDING') return;

    const fail = Math.random() < 0.3;

    if (fail) {
      const reasons = [
        'bank_unreachable',
        'connection_timeout',
        'routing_error',
        'random_failure',
      ];
      payout.status = 'FAILED';
      payout.failureReason =
        reasons[Math.floor(Math.random() * reasons.length)];
    } else {
      payout.status = 'COMPLETED';
      payout.failureReason = null;
    }

    await this.payoutRepo.save(payout);
  }
}
