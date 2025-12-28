import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashoutRequest } from './cashout-request.entity';
import { WebsocketGateway } from '../modules/websocket/websocket.gateway';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';

/**
 * CashoutSchedulerService
 *
 * OPTION A – MOCK ENGINE
 *
 * - Every 30 seconds, it looks for all PENDING cashouts.
 * - For each PENDING cashout, it randomly decides:
 *    - COMPLETED  (70% chance)
 *    - FAILED     (30% chance, with a mock failureReason)
 * - It does NOT touch wallet balances. Funds are:
 *    - locked when cashout is created,
 *    - refunded only if the user cancels (via cancel endpoint)
 *      or an admin uses adminFailCashout().
 *
 * FV-10 RULE:
 * - NEVER mark FAILED unless refund + refund-ledger row were written successfully.
 *
 * FV-11 RULE:
 * - NEVER mark COMPLETED unless completion-ledger row is written in the same transaction.
 */
@Injectable()
export class CashoutSchedulerService {
  private readonly logger = new Logger(CashoutSchedulerService.name);

  constructor(
    @InjectRepository(CashoutRequest)
    private readonly cashoutRepo: Repository<CashoutRequest>,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,

    private readonly websocketGateway: WebsocketGateway,
  ) {}

  // Run every 30 seconds
  @Interval(30_000)
  async handleTick() {
    // ✅ DEV FLAG: only run the mock engine when explicitly enabled
    // Set env: MOCK_CASHOUT_ENGINE=true
    const enabled =
      String(process.env.MOCK_CASHOUT_ENGINE || '').toLowerCase() === 'true';
    if (!enabled) return;

    // Find all cashouts that are still pending
    const pending = await this.cashoutRepo.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
    });

    if (!pending.length) {
      this.logger.log('💸 Cashout scheduler tick – no pending cashouts');
      return;
    }

    this.logger.log(
      `💸 Cashout scheduler processing ${pending.length} pending cashout(s)`,
    );

    for (const cashout of pending) {
      await this.processSingleCashout(cashout);
    }
  }

  /**
   * Apply mock success/failure decision to a single cashout.
   */
  private async processSingleCashout(cashout: CashoutRequest) {
    // Double-check status in case it changed between query and processing
    if (cashout.status !== 'PENDING') {
      return;
    }

    const shouldFail = Math.random() < 0.3; // 30% failure chance

    if (shouldFail) {
      const reasons = [
        'bank_unreachable',
        'connection_timeout',
        'routing_error',
        'random_failure',
      ];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];

      // ✅ FAILED PATH (FV-10)
      const saved = await this.cashoutRepo.manager.transaction(
        async (manager) => {
          const cashoutRepo = manager.getRepository(CashoutRequest);
          const walletRepo = manager.getRepository(Wallet);
          const txRepo = manager.getRepository(WalletTransaction);

          const fresh = await cashoutRepo.findOne({
            where: { id: cashout.id },
          });
          if (!fresh) return null;
          if (fresh.status !== 'PENDING') return null;

          const wallet = await walletRepo.findOne({
            where: { id: fresh.walletId },
          });
          if (!wallet) {
            throw new Error('Wallet not found for cashout refund');
          }

          const amt = Number(fresh.amountCents) || 0;
          if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Invalid cashout amount for refund');
          }

          wallet.cashoutAvailableCents += amt;
          await walletRepo.save(wallet);

          await txRepo.save(
            txRepo.create({
              walletId: wallet.id,
              type: 'cashout',
              amountCents: amt,
              metadata: {
                reason: 'cashout_refund',
                cashoutId: fresh.id,
                failureReason: reason,
                via: 'mock_cashout_engine',
              },
            }),
          );

          fresh.status = 'FAILED';
          fresh.failureReason = reason;

          return await cashoutRepo.save(fresh);
        },
      );

      if (!saved) return;

      this.websocketGateway.emitCashoutUpdated(saved);

      this.logger.log(
        `💸 Cashout ${saved.id} FAILED – reason=${saved.failureReason}, amountCents=${saved.amountCents}`,
      );
      return;
    }

    // ✅ SUCCESS PATH (FV-11 FIX)
    const saved = await this.cashoutRepo.manager.transaction(
      async (manager) => {
        const cashoutRepo = manager.getRepository(CashoutRequest);
        const txRepo = manager.getRepository(WalletTransaction);

        const fresh = await cashoutRepo.findOne({
          where: { id: cashout.id },
        });
        if (!fresh) return null;
        if (fresh.status !== 'PENDING') return null;

        const amt = Number(fresh.amountCents) || 0;
        if (!Number.isFinite(amt) || amt <= 0) {
          throw new Error('Invalid cashout amount for completion');
        }

        // ✅ COMPLETION LEDGER ROW (balances the original -amt)
        await txRepo.save(
          txRepo.create({
            walletId: fresh.walletId,
            type: 'cashout',
            amountCents: amt,
            metadata: {
              reason: 'cashout_complete',
              cashoutId: fresh.id,
              via: 'mock_cashout_engine',
            },
          }),
        );

        fresh.status = 'COMPLETED';
        fresh.failureReason = null;

        return await cashoutRepo.save(fresh);
      },
    );

    if (!saved) return;

    this.websocketGateway.emitCashoutUpdated(saved);

    this.logger.log(
      `💸 Cashout ${saved.id} COMPLETED – amountCents=${saved.amountCents}`,
    );
  }
}
