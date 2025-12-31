// src/wallet/wallet.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';


import { Wallet } from './wallet.entity';
import { CashoutRequest, CashoutStatus } from './cashout-request.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { BankInfoService } from './bank-info.service';
import { WebsocketGateway } from '../modules/websocket/websocket.gateway';

export type WalletSummary = {
  id: number;
  userId: number;
  balanceCents: number;
  spendableBalanceCents: number;
  cashoutAvailableCents: number;
  createdAt: Date;
  updatedAt: Date;
};

// ==================================================
// M6: Canonical cashout API shapes (frontend-stable)
// ==================================================
export type CashoutStatusCanonical = 'PENDING' | 'COMPLETED' | 'FAILED';

export type CashoutDto = {
  id: number;
  status: CashoutStatusCanonical;
  amountCents: number;
  failureReason: string | null;
  destinationLast4: string | null;
  createdAt: string;
  retryOfCashoutId: number | null; // ✅ ADDED
};

export type CashoutListResponse = {
  items: CashoutDto[];
  meta: { count: number; status: CashoutStatusCanonical | 'ALL' };
};

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(CashoutRequest)
    private readonly cashoutRepo: Repository<CashoutRequest>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,

    private readonly dataSource: DataSource,
    private readonly bankInfoService: BankInfoService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  // ==================================================
  // INTERNAL
  // ==================================================
  private async getOrCreateWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({
        userId,
        balanceCents: 0,
        spendableBalanceCents: 0,
        cashoutAvailableCents: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  private emitWalletUpdated(wallet: Wallet) {
    if (!wallet) return;
    this.websocketGateway.emitWalletUpdated({
      userId: wallet.userId,
      walletId: wallet.id,
      balanceCents: Number(wallet.balanceCents),
      spendableBalanceCents: Number(wallet.spendableBalanceCents),
      cashoutAvailableCents: Number(wallet.cashoutAvailableCents),
    });
  }

  // ==================================================
  // BASIC READS
  // ==================================================
  async getWalletForUser(userId: number): Promise<Wallet> {
    return this.getOrCreateWallet(userId);
  }

  async getSummary(userId: number): Promise<WalletSummary> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      id: wallet.id,
      userId: wallet.userId,
      balanceCents: Number(wallet.balanceCents),
      spendableBalanceCents: Number(wallet.spendableBalanceCents),
      cashoutAvailableCents: Number(wallet.cashoutAvailableCents),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  // ==================================================
  // DEPOSIT / SPEND
  // ==================================================
  async deposit(userId: number, amountCents: number): Promise<Wallet> {
    if (amountCents <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    let wallet = await this.getOrCreateWallet(userId);

    wallet.balanceCents = Number(wallet.balanceCents) + amountCents;
    wallet.spendableBalanceCents =
      Number(wallet.spendableBalanceCents) + amountCents;

    wallet = await this.walletRepo.save(wallet);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'deposit',
        amountCents,
        metadata: {},
      }),
    );

    this.emitWalletUpdated(wallet);
    return wallet;
  }

  async spend(userId: number, amountCents: number): Promise<Wallet> {
    if (amountCents <= 0) {
      throw new BadRequestException('Spend amount must be positive');
    }

    let wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.spendableBalanceCents) < amountCents) {
      throw new BadRequestException('Insufficient spendable balance');
    }

    wallet.balanceCents = Number(wallet.balanceCents) - amountCents;
    wallet.spendableBalanceCents =
      Number(wallet.spendableBalanceCents) - amountCents;

    wallet = await this.walletRepo.save(wallet);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'spend',
        amountCents: -amountCents,
        metadata: {},
      }),
    );

    this.emitWalletUpdated(wallet);
    return wallet;
  }

  // ==================================================
  // STORE ITEMS / PAYOUTS
  // ==================================================
  async spendWithPayout(
    buyerId: number,
    venueOwnerId: number,
    amountCents: number,
    platformFeePercent: number,
    extraMetadata: Record<string, any> = {},
  ): Promise<{ feeCents: number; payoutCents: number }> {
    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (platformFeePercent < 0 || platformFeePercent > 100) {
      throw new BadRequestException('Invalid platform fee percent');
    }

    const feeCents = Math.round((amountCents * platformFeePercent) / 100);
    const payoutCents = amountCents - feeCents;

    let finalBuyerWallet: Wallet | null = null;
    let finalOwnerWallet: Wallet | null = null;

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      // BUYER
      let buyerWallet = await walletRepo.findOne({ where: { userId: buyerId } });
      if (!buyerWallet) throw new BadRequestException('Buyer wallet not found');

      if (Number(buyerWallet.spendableBalanceCents) < amountCents)
        throw new BadRequestException('Insufficient funds');

      buyerWallet.balanceCents -= amountCents;
      buyerWallet.spendableBalanceCents -= amountCents;
      buyerWallet = await walletRepo.save(buyerWallet);

      // Record buyer spend WITH payout
      await txRepo.save(
        txRepo.create({
          walletId: buyerWallet.id,
          type: 'spend_with_payout',
          amountCents: -amountCents,
          metadata: {
            ...extraMetadata,
            role: 'buyer',
            platformFeeCents: feeCents,
            payoutCents,
          },
        }),
      );

      // OWNER
      let ownerWallet = await walletRepo.findOne({
        where: { userId: venueOwnerId },
      });

      if (!ownerWallet) {
        ownerWallet = walletRepo.create({
          userId: venueOwnerId,
          balanceCents: 0,
          spendableBalanceCents: 0,
          cashoutAvailableCents: 0,
        });
      }

      ownerWallet.balanceCents += payoutCents;
      ownerWallet.cashoutAvailableCents += payoutCents;
      ownerWallet = await walletRepo.save(ownerWallet);

      // Record owner payout credit
      await txRepo.save(
        txRepo.create({
          walletId: ownerWallet.id,
          type: 'payout_credit',
          amountCents: payoutCents,
          metadata: {
            ...extraMetadata,
            role: 'venueOwner',
            platformFeeCents: feeCents,
          },
        }),
      );

      finalBuyerWallet = buyerWallet;
      finalOwnerWallet = ownerWallet;
    });

    if (finalBuyerWallet) this.emitWalletUpdated(finalBuyerWallet);
    if (finalOwnerWallet) this.emitWalletUpdated(finalOwnerWallet);

    return { feeCents, payoutCents };
  }

  async chargeStoreItemPurchase(
    buyerId: number,
    venueOwnerId: number,
    amountCents: number,
    platformFeePercent: number,
    extraMetadata: Record<string, any> = {},
  ): Promise<{ feeCents: number; payoutCents: number }> {
    return this.spendWithPayout(
      buyerId,
      venueOwnerId,
      amountCents,
      platformFeePercent,
      extraMetadata,
    );
  }

  // ==================================================
  // TRANSFERS
  // ==================================================
  async transfer(
    senderId: number,
    receiverId: number,
    amountCents: number,
  ): Promise<void> {
    if (amountCents <= 0)
      throw new BadRequestException('Transfer amount must be positive');

    let finalSender: Wallet | null = null;
    let finalReceiver: Wallet | null = null;

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      let senderWallet = await walletRepo.findOne({
        where: { userId: senderId },
      });
      if (!senderWallet)
        throw new BadRequestException('Sender wallet not found');

      if (Number(senderWallet.spendableBalanceCents) < amountCents)
        throw new BadRequestException('Insufficient funds');

      senderWallet.balanceCents -= amountCents;
      senderWallet.spendableBalanceCents -= amountCents;
      senderWallet = await walletRepo.save(senderWallet);

      await txRepo.save(
        txRepo.create({
          walletId: senderWallet.id,
          type: 'transfer_out',
          amountCents: -amountCents,
          metadata: { toUserId: receiverId },
        }),
      );

      let receiverWallet = await walletRepo.findOne({
        where: { userId: receiverId },
      });
      if (!receiverWallet) {
        receiverWallet = walletRepo.create({
          userId: receiverId,
          balanceCents: 0,
          spendableBalanceCents: 0,
          cashoutAvailableCents: 0,
        });
      }

      receiverWallet.balanceCents += amountCents;
      receiverWallet.spendableBalanceCents += amountCents;
      receiverWallet = await walletRepo.save(receiverWallet);

      await txRepo.save(
        txRepo.create({
          walletId: receiverWallet.id,
          type: 'transfer_in',
          amountCents,
          metadata: { fromUserId: senderId },
        }),
      );

      finalSender = senderWallet;
      finalReceiver = receiverWallet;
    });

    if (finalSender) this.emitWalletUpdated(finalSender);
    if (finalReceiver) this.emitWalletUpdated(finalReceiver);
  }

  // ==================================================
  // CASHOUT FLOW
  // ==================================================
  async cashout(userId: number, amountCents: number): Promise<CashoutRequest> {
    if (amountCents <= 0)
      throw new BadRequestException('Cashout amount must be positive');

    const bankInfo = await this.bankInfoService.getForUser(userId);
    if (!bankInfo)
      throw new BadRequestException('Bank info required before cashout.');

    let updatedWallet: Wallet | null = null;

    const savedCashout = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const txRepo = manager.getRepository(WalletTransaction);

      const wallet = await walletRepo.findOne({ where: { userId } });
      if (!wallet) throw new BadRequestException('Wallet not found');

      if (Number(wallet.cashoutAvailableCents) < amountCents)
        throw new BadRequestException('Insufficient cashout balance');

      wallet.cashoutAvailableCents -= amountCents;
      const savedWallet = await walletRepo.save(wallet);

      const cashout = cashoutRepo.create({
        walletId: savedWallet.id,
        amountCents,
        status: 'PENDING',
        failureReason: null,
        destinationLast4: bankInfo.accountLast4 ?? null,
      });

      const result = await cashoutRepo.save(cashout);

      await txRepo.save(
        txRepo.create({
          walletId: savedWallet.id,
          type: 'cashout',
          amountCents: -amountCents,
          metadata: {
            cashoutId: result.id,
            destinationLast4: bankInfo.accountLast4 ?? null,
            reason: 'cashout_request',
            via: 'wallet_cashout',
          },
        }),
      );

      updatedWallet = savedWallet;
      return result;
    });

    if (updatedWallet) this.emitWalletUpdated(updatedWallet);
    this.websocketGateway.emitCashoutCreated(savedCashout);

    return savedCashout;
  }

  async getCashoutsForUser(userId: number): Promise<CashoutRequest[]> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) return [];

    return this.cashoutRepo.find({
      where: { wallet: { id: wallet.id } },
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================================================
  // M6 / FV-12: Get single cashout by id (user-scoped)
  // GET /wallet/cashouts/:id
  // ==================================================
  async getCashoutForUserById(
    userId: number,
    cashoutId: number,
  ): Promise<CashoutDto> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const cashout = await this.cashoutRepo.findOne({
      where: {
        id: cashoutId,
        wallet: { id: wallet.id },
      },
      relations: ['wallet'],
    });

    if (!cashout) {
      throw new NotFoundException('Cashout not found');
    }

    return this.toCashoutDto(cashout);
  }

  // ==================================================
  // M6: Cashouts — canonical listing (status filter + normalized output)
  // ==================================================
  private normalizeCashoutStatus(
    input?: string | null,
  ): CashoutStatusCanonical | 'ALL' {
    const v = String(input || '').trim().toLowerCase();
    if (!v) return 'ALL';
    if (v === 'pending') return 'PENDING';
    if (v === 'completed') return 'COMPLETED';
    if (v === 'failed') return 'FAILED';
    return 'ALL';
  }

  private toCashoutDto(c: CashoutRequest): CashoutDto {
    const status =
      (String(c?.status || '').toUpperCase() as CashoutStatusCanonical) ||
      'PENDING';

    return {
      id: Number(c.id),
      status:
        status === 'PENDING' || status === 'COMPLETED' || status === 'FAILED'
          ? status
          : 'PENDING',
      amountCents: Number(c.amountCents ?? 0),
      failureReason: c.failureReason ?? null,
      destinationLast4: (c as any).destinationLast4 ?? null,
      createdAt: c.createdAt
        ? new Date(c.createdAt).toISOString()
        : new Date().toISOString(),
      retryOfCashoutId: (c as any).retryOfCashoutId ?? null, //
    };
  }

  async listCashoutsCanonical(
    userId: number,
    statusQuery?: string | null,
  ): Promise<CashoutListResponse> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    const normalized = this.normalizeCashoutStatus(statusQuery);

    if (!wallet) {
      return { items: [], meta: { count: 0, status: normalized } };
    }

    const whereBase: any = { wallet: { id: wallet.id } };
    const where =
      normalized === 'ALL' ? whereBase : { ...whereBase, status: normalized };

    const rows = await this.cashoutRepo.find({
      where,
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
    });

    const items = (rows || []).map((r) => this.toCashoutDto(r));
    return {
      items,
      meta: { count: items.length, status: normalized },
    };
  }

  // ==================================================
  // DEV: Add cashout-ready balance directly (enum-safe)
  // ==================================================
  async devAddCashoutBalance(
    userId: number,
    amountCents: number,
  ): Promise<Wallet> {
    if (amountCents <= 0)
      throw new BadRequestException('Amount must be positive');

    let wallet = await this.getOrCreateWallet(userId);
    wallet.balanceCents += amountCents;
    wallet.cashoutAvailableCents += amountCents;

    wallet = await this.walletRepo.save(wallet);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'deposit',
        amountCents,
        metadata: { dev: true, reason: 'dev_add_cashout_balance' },
      }),
    );

    this.emitWalletUpdated(wallet);
    return wallet;
  }

  // ==================================================
  // ADMIN: Complete / Fail
  // ==================================================
  async adminCompleteCashout(cashoutId: number): Promise<CashoutRequest> {
    const cashout = await this.cashoutRepo.findOne({
      where: { id: cashoutId },
      relations: ['wallet'],
    });

    if (!cashout) throw new NotFoundException('Cashout not found');
    if (cashout.status === 'COMPLETED') return cashout;

    cashout.status = 'COMPLETED';
    cashout.failureReason = null;

    const saved = await this.cashoutRepo.save(cashout);
    this.websocketGateway.emitCashoutUpdated(saved);

    return saved;
  }

  // ✅ UPDATED (PATCH): explicit QueryRunner txn to eliminate TransactionNotStartedError under concurrency (SQLite)
  async adminFailCashout(
    cashoutId: number,
    failureReason: string,
  ): Promise<CashoutRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let txnStarted = false;
    try {
      await queryRunner.startTransaction();
      txnStarted = true;

      const manager = queryRunner.manager;
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction); // ✅ ADDED (THIS WAS MISSING)

      // Load minimal cashout first
      const cashout = await cashoutRepo.findOne({ where: { id: cashoutId } });
      if (!cashout) throw new NotFoundException('Cashout not found');

      // Never allow COMPLETED -> FAILED
      if (cashout.status === 'COMPLETED') {
        throw new BadRequestException('Cannot fail a completed cashout');
      }

      // Idempotent: already FAILED => no refund
      if (cashout.status === 'FAILED') {
        await queryRunner.commitTransaction();
        txnStarted = false;
        return cashout;
      }

      // ATOMIC CLAIM: only one request can flip PENDING -> FAILED
      const reason = failureReason || 'Cashout failed';

      const res = await cashoutRepo.update(
        { id: cashoutId, status: 'PENDING' as any },
        { status: 'FAILED' as any, failureReason: reason },
      );

      if (!res.affected) {
        const fresh = await cashoutRepo.findOne({ where: { id: cashoutId } });
        if (!fresh) throw new NotFoundException('Cashout not found');

        if (fresh.status === 'FAILED') {
          await queryRunner.commitTransaction();
          txnStarted = false;
          return fresh;
        }
        if (fresh.status === 'COMPLETED') {
          throw new BadRequestException('Cannot fail a completed cashout');
        }

        throw new BadRequestException('Only pending cashouts can be failed');
      }

      // Refund ONCE (only the winner reaches here)
      const wallet = await walletRepo.findOne({
        where: { id: cashout.walletId },
      });
      if (!wallet) throw new BadRequestException('Wallet not found');

      const amount = Number(cashout.amountCents);

      wallet.cashoutAvailableCents += amount;
      await walletRepo.save(wallet);

      // ✅ ADDED: ledger refund entry (this is what your test proved was missing)
      await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout',
          amountCents: amount, // +amount = refund reversal for admin fail
          metadata: {
            reason: 'cashout_fail_refund',
            cashoutId: cashout.id,
            via: 'admin_fail',
            failureReason: reason,
          },
        }),
      );

      const updated = await cashoutRepo.findOne({ where: { id: cashoutId } });
      if (!updated) throw new NotFoundException('Cashout not found');

      await queryRunner.commitTransaction();
      txnStarted = false;

      // Post-txn emits
      const latestWallet = await this.walletRepo.findOne({
        where: { id: updated.walletId },
      });
      if (latestWallet) this.emitWalletUpdated(latestWallet);

      this.websocketGateway.emitCashoutUpdated(updated);
      return updated;
    } catch (e) {
      if (txnStarted) {
        try {
          await queryRunner.rollbackTransaction();
        } catch {}
      }
      throw e;
    } finally {
      try {
        await queryRunner.release();
      } catch {}
    }
  }

  // ==================================================
  // ADMIN/DEV: Repair FAILED cashout that is debit-only (FV-10)
  // ==================================================
  async adminRepairFailedCashoutRefund(
    cashoutId: number,
  ): Promise<CashoutRequest> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      const cashout = await cashoutRepo.findOne({ where: { id: cashoutId } });
      if (!cashout) throw new NotFoundException('Cashout not found');

      if (cashout.status !== 'FAILED') {
        throw new BadRequestException('Only FAILED cashouts can be repaired');
      }

      const amount = Number(cashout.amountCents);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Invalid cashout amount');
      }

      const all = await txRepo.find({
        where: {
          walletId: cashout.walletId as any,
          type: 'cashout' as any,
        } as any,
        order: { createdAt: 'ASC' as any },
      });

      const rows = (all || []).filter((r: any) => {
        const m = r?.metadata;
        return m && Number(m.cashoutId) === Number(cashout.id);
      });

      if (!rows.length) {
        throw new BadRequestException('No ledger rows found for this cashout');
      }

      const sum = rows.reduce(
        (s: number, r: any) => s + Number(r.amountCents || 0),
        0,
      );

      if (sum === 0 || sum === amount) {
        return cashout;
      }

      if (sum !== -amount) {
        throw new BadRequestException(
          `Not a debit-only FAILED cashout (sum=${sum}, amount=${amount})`,
        );
      }

      const wallet = await walletRepo.findOne({
        where: { id: cashout.walletId },
      });
      if (!wallet) throw new BadRequestException('Wallet not found');

      wallet.cashoutAvailableCents += amount;
      await walletRepo.save(wallet);

      await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout',
          amountCents: amount,
          metadata: {
            reason: 'cashout_repair_refund',
            cashoutId: cashout.id,
            via: 'repair_endpoint',
            failureReason: cashout.failureReason ?? 'repaired',
          },
        } as any),
      );

      const updated = await cashoutRepo.findOne({ where: { id: cashoutId } });
      if (!updated) throw new NotFoundException('Cashout not found');

      return updated;
    });

    const wallet = await this.walletRepo.findOne({
      where: { id: saved.walletId },
    });
    if (wallet) this.emitWalletUpdated(wallet);

    this.websocketGateway.emitCashoutUpdated(saved);
    return saved;
  }

  // ==================================================
  // OWNER: Cancel own cashout (PENDING → FAILED + refund)
  // ==================================================
  async cancelCashout(
    userId: number,
    cashoutId: number,
  ): Promise<CashoutRequest> {
    const savedCashout = await this.dataSource.transaction(async (manager) => {
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      const cashout = await cashoutRepo.findOne({
        where: { id: cashoutId },
        relations: ['wallet'],
      });

      if (!cashout) throw new NotFoundException('Cashout not found');
      if (!cashout.wallet || cashout.wallet.userId !== userId)
        throw new BadRequestException('Cashout does not belong to this user');

      const res = await cashoutRepo.update(
        { id: cashoutId, status: 'PENDING' as any },
        { status: 'FAILED' as any, failureReason: 'Cancelled by owner' },
      );

      if (!res.affected) {
        throw new BadRequestException('Only pending cashouts can be cancelled');
      }

      const wallet = await walletRepo.findOne({
        where: { id: cashout.walletId },
      });
      if (!wallet) throw new BadRequestException('Wallet not found');

      const amount = Number(cashout.amountCents);

      wallet.cashoutAvailableCents += amount;
      await walletRepo.save(wallet);

      await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout',
          amountCents: amount,
          metadata: {
            reason: 'cashout_cancel_refund',
            cashoutId: cashout.id,
            via: 'cancel_endpoint',
          },
        }),
      );

      const updated = await cashoutRepo.findOne({
        where: { id: cashoutId },
        relations: ['wallet'],
      });
      if (!updated) throw new NotFoundException('Cashout not found');

      return updated;
    });

    const wallet = await this.walletRepo.findOne({
      where: { id: savedCashout.walletId },
    });
    if (wallet) this.emitWalletUpdated(wallet);

    this.websocketGateway.emitCashoutUpdated(savedCashout);
    return savedCashout;
  }

  // ==================================================
  // OWNER: Retry failed cashout (creates new PENDING)
  // ==================================================
  async retryCashout(
    userId: number,
    cashoutId: number,
  ): Promise<CashoutRequest> {
    // ✅ ADDED: generic return type to stop TS inferring CashoutRequest | CashoutRequest[]
    return this.dataSource.transaction<CashoutRequest>(async (manager) => {
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      const original = await cashoutRepo.findOne({
        where: { id: cashoutId },
        relations: ['wallet'],
      });

      if (!original) throw new NotFoundException('Cashout not found');
      if (!original.wallet || original.wallet.userId !== userId) {
        throw new BadRequestException('Cashout does not belong to this user');
      }
      if (original.status !== 'FAILED') {
        throw new BadRequestException('Only failed cashouts can be retried');
      }

      const amount = Number(original.amountCents);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Invalid cashout amount on original');
      }

      const existingPending = await cashoutRepo.findOne({
        where: {
          retryOfCashoutId: original.id as any,
          status: 'PENDING' as any,
        } as any,
      });

      if (existingPending) return existingPending;

      const wallet = await walletRepo.findOne({
        where: { id: original.walletId },
      });
      if (!wallet) throw new BadRequestException('Wallet not found');

      if (Number(wallet.cashoutAvailableCents) < amount) {
        throw new BadRequestException('Insufficient cashout balance');
      }

      wallet.cashoutAvailableCents =
        Number(wallet.cashoutAvailableCents) - amount;
      await walletRepo.save(wallet);

     // ✅ Single-object DeepPartial prevents TS from selecting the array overload
const retryPartial: DeepPartial<CashoutRequest> = {
  walletId: wallet.id,
  amountCents: amount,
  status: 'PENDING',
  failureReason: null,
  destinationLast4: original.destinationLast4 ?? null,
  retryOfCashoutId: original.id as any,
};

const retry = await cashoutRepo.save(cashoutRepo.create(retryPartial));



      await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout',
          amountCents: -amount,
          metadata: {
            cashoutId: retry.id,
            reason: 'cashout_request',
            via: 'wallet_cashout_retry',
            retryOfCashoutId: original.id,
            destinationLast4: original.destinationLast4 ?? null,
          },
        }),
      );

      return retry;
    });
  }

  // ==================================================
  // TRANSACTIONS
  // ==================================================
  async getTransactionsForUser(userId: number): Promise<WalletTransaction[]> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) return [];

    return this.txRepo.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
  }

  // ==================================================
  // OWNER METRICS
  // ==================================================
  async getCashoutMetrics(userId: number) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      return {
        totalCashouts: 0,
        totalPending: 0,
        totalCompleted: 0,
        totalFailed: 0,
        totalPaidOutCents: 0,
        totalPendingCents: 0,
        totalFailedReturnedCents: 0,
        totalAmountPaidOut: 0,
        totalAmountPending: 0,
        totalAmountFailedReturned: 0,
        latestCompletedCashout: null,
      };
    }

    const all = await this.cashoutRepo.find({
      where: { wallet: { id: wallet.id } },
      order: { createdAt: 'DESC' },
    });

    const total = all.length;
    const pending = all.filter((c) => c.status === 'PENDING').length;
    const completed = all.filter((c) => c.status === 'COMPLETED').length;
    const failed = all.filter((c) => c.status === 'FAILED').length;

    const completedCashouts = all.filter((c) => c.status === 'COMPLETED');
    const totalPaidOutCents = completedCashouts.reduce(
      (sum, c) => sum + Number(c.amountCents),
      0,
    );

    const totalPendingCents = all
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + Number(c.amountCents), 0);

    const totalFailedReturnedCents = all
      .filter((c) => c.status === 'FAILED')
      .reduce((sum, c) => sum + Number(c.amountCents), 0);

    const latestCompleted =
      completedCashouts.length ? completedCashouts[0] : null;

    const latestCompletedCashout = latestCompleted
      ? {
          id: latestCompleted.id,
          amountCents: Number(latestCompleted.amountCents),
          status: latestCompleted.status,
          destinationLast4: latestCompleted.destinationLast4,
          failureReason: latestCompleted.failureReason,
          createdAt: latestCompleted.createdAt,
        }
      : null;

    return {
      totalCashouts: total,
      totalPending: pending,
      totalCompleted: completed,
      totalFailed: failed,

      totalPaidOutCents,
      totalPendingCents,
      totalFailedReturnedCents,

      totalAmountPaidOut: totalPaidOutCents,
      totalAmountPending: totalPendingCents,
      totalAmountFailedReturned: totalFailedReturnedCents,

      latestCompletedCashout,
    };
  }

  // ==================================================
  // NEXT PAYOUT INFO
  // ==================================================
  async getNextPayout(userId: number) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) return null;

    const next = await this.cashoutRepo.findOne({
      where: { wallet: { id: wallet.id }, status: 'PENDING' },
      order: { createdAt: 'ASC' },
    });

    if (!next) return null;

    return {
      id: next.id,
      amountCents: Number(next.amountCents),
      status: next.status,
      destinationLast4: next.destinationLast4,
      createdAt: next.createdAt,
    };
  }

  // ==================================================
  // ADMIN FILTERS
  // ==================================================
  async getCashoutsByStatus(status: CashoutStatus) {
    return this.cashoutRepo.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }
}
