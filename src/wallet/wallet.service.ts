// src/wallet/wallet.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import Stripe from 'stripe';

import { Wallet } from './wallet.entity';
import { CashoutRequest, CashoutStatus } from './cashout-request.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { BankInfoService } from './bank-info.service';
import { WebsocketGateway } from '../modules/websocket/websocket.gateway';
import { OwnerBankInfo } from '../owner/owner-bank-info.entity';
import { PayoutSource } from './payout-source.entity';
import { PayoutAllocationService } from './payout-allocation.service';
import { LedgerEntry } from '../modules/ledger/ledger-entry.entity';

export type WalletSummary = {
  id: number;
  userId: number;
  balanceCents: number;

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â„¢ M35: spendable is what remains after cashoutAvailable is reserved.
  // The invariant we lock/prove at the API boundary:
  //    balance = spendable + cashoutAvailable
  spendableBalanceCents: number;

  cashoutAvailableCents: number;

  // Informational only: derived from PENDING cashouts (does NOT participate in invariant)
  pendingHeldCents: number;

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ M35 lock: server-side invariant assertion (balance = spendable + cashoutAvailable AND spendable non-negative)
  ok: boolean;

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
  retryOfCashoutId: number | null; // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ADDED
};

export type CashoutListResponse = {
  items: CashoutDto[];
  meta: { count: number; status: CashoutStatusCanonical | 'ALL' };
};

@Injectable()
export class WalletService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(CashoutRequest)
    private readonly cashoutRepo: Repository<CashoutRequest>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,

    @InjectRepository(OwnerBankInfo)
    private readonly ownerBankInfoRepo: Repository<OwnerBankInfo>,

    private readonly dataSource: DataSource,
    private readonly bankInfoService: BankInfoService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly payoutAllocationService: PayoutAllocationService,
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

    // Informational: pending-held is the sum of PENDING cashouts (does NOT participate in invariant)
    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX: do NOT reference raw FK column name; join relation so TypeORM resolves correct physical column (walletid vs "walletId")
    const raw = await this.cashoutRepo
      .createQueryBuilder('c')
      .innerJoin('c.wallet', 'w')
      .select('COALESCE(SUM(c.amountCents), 0)', 'sum')
      .where('w.id = :walletId', { walletId: wallet.id })
      .andWhere('c.status = :status', { status: 'PENDING' })
      .getRawOne();

    const pendingHeldCents = Number(raw?.sum ?? 0);

    const balanceCents = Number(wallet.balanceCents);
    const cashoutAvailableCents = Number(wallet.cashoutAvailableCents);

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â„¢ M35 invariant (locked): balance = spendable + cashoutAvailable
    // Spendable is derived as the remainder after reserving cashoutAvailable.
    // NOTE: We do NOT trust stored wallet.spendableBalanceCents here because it can drift
    // if not updated in every flow. The API boundary must remain conserved.
    const derivedSpendable = balanceCents - cashoutAvailableCents;

    // If derivedSpendable < 0, the wallet is in an impossible state (cashoutAvailable exceeds balance).
    // We clamp spendable to 0 for display, but ok=false will expose the invariant breach.
    const spendableBalanceCents = Math.max(0, derivedSpendable);

    const ok =
      balanceCents === spendableBalanceCents + cashoutAvailableCents &&
      derivedSpendable >= 0;

    return {
      id: wallet.id,
      userId: wallet.userId,
      balanceCents,
      spendableBalanceCents,
      cashoutAvailableCents,
      pendingHeldCents,
      ok,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  // ==================================================
  // DEPOSIT / SPEND
  // ==================================================
  async deposit(userId: number, amountCents: number, depositRef?: string): Promise<Wallet> {
    if (amountCents <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    let finalWallet: Wallet | null = null;

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      let wallet = await walletRepo.findOne({ where: { userId } });
      if (!wallet) {
        wallet = walletRepo.create({
          userId,
          balanceCents: 0,
          spendableBalanceCents: 0,
          cashoutAvailableCents: 0,
        });
        wallet = await walletRepo.save(wallet);
      }

      wallet.balanceCents = Number(wallet.balanceCents) + amountCents;
      wallet.spendableBalanceCents = Number(wallet.spendableBalanceCents) + amountCents;

      wallet = await walletRepo.save(wallet);

      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'deposit',
          amountCents,
          metadata: {},
          depositRef: depositRef ?? null,
        }),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'deposit',
            depositRef: depositRef ?? null,
          },
        }),
      );

      finalWallet = wallet;
    });

    if (finalWallet) this.emitWalletUpdated(finalWallet);
    return finalWallet!;
  }

  async spend(userId: number, amountCents: number): Promise<Wallet> {
    if (amountCents <= 0) {
      throw new BadRequestException('Spend amount must be positive');
    }

    let finalWallet: Wallet | null = null;

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      let wallet = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) throw new BadRequestException('Wallet not found');

      const derivedSpendable =
        Number(wallet.balanceCents) - Number(wallet.cashoutAvailableCents);

      if (Number(wallet.balanceCents) < amountCents) {
        throw new BadRequestException('Insufficient balance (no-debt enforced)');
      }

      wallet.balanceCents = Number(wallet.balanceCents) - amountCents;
      wallet.spendableBalanceCents =
        Number(wallet.spendableBalanceCents) - amountCents;

      wallet = await walletRepo.save(wallet);

      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'spend',
          amountCents: -amountCents,
          metadata: {},
        }),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'debit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'spend',
          },
        }),
      );

      finalWallet = wallet;
    });

    if (finalWallet) this.emitWalletUpdated(finalWallet);
    return finalWallet!;
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

      const orderedUserIds =
        buyerId < venueOwnerId ? [buyerId, venueOwnerId] : [venueOwnerId, buyerId];

      const lockedWallets = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId IN (:...userIds)', { userIds: orderedUserIds })
        .orderBy('wallet.userId', 'ASC')
        .getMany();

      let buyerWallet =
        lockedWallets.find((w) => Number(w.userId) === buyerId) ?? null;
      if (!buyerWallet) throw new BadRequestException('Buyer wallet not found');

      const derivedSpendable =
        Number(buyerWallet.balanceCents) - Number(buyerWallet.cashoutAvailableCents);

      if (Number(buyerWallet.balanceCents) < amountCents) {
        throw new BadRequestException('Insufficient balance (no-debt enforced)');
      }

      buyerWallet.balanceCents = Number(buyerWallet.balanceCents) - amountCents;
      buyerWallet.spendableBalanceCents =
        Number(buyerWallet.spendableBalanceCents) - amountCents;
      buyerWallet = await walletRepo.save(buyerWallet);

      const savedBuyerTx = await txRepo.save(
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

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: buyerWallet.userId,
          venueId: null,
          direction: 'debit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number(savedBuyerTx.id),
          metadata: {
            walletTransactionType: 'spend_with_payout',
            role: 'buyer',
            platformFeeCents: feeCents,
            payoutCents,
            ...extraMetadata,
          },
        }),
      );

      let ownerWallet =
        lockedWallets.find((w) => Number(w.userId) === venueOwnerId) ?? null;

      if (!ownerWallet) {
        ownerWallet = walletRepo.create({
          userId: venueOwnerId,
          balanceCents: 0,
          spendableBalanceCents: 0,
          cashoutAvailableCents: 0,
        });
      }

      ownerWallet.balanceCents = Number(ownerWallet.balanceCents) + payoutCents;
      ownerWallet.cashoutAvailableCents =
        Number(ownerWallet.cashoutAvailableCents) + payoutCents;

      ownerWallet = await walletRepo.save(ownerWallet);

      const savedOwnerTx = await txRepo.save(
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

      await ledgerRepo.save(
        ledgerRepo.create({
          userId: ownerWallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents: payoutCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number(savedOwnerTx.id),
          metadata: {
            walletTransactionType: 'payout_credit',
            role: 'venueOwner',
            platformFeeCents: feeCents,
            ...extraMetadata,
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
  async transfer(senderId: number, receiverId: number, amountCents: number): Promise<void> {
    if (amountCents <= 0) {
      throw new BadRequestException('Transfer amount must be positive');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('Sender and receiver must be different');
    }

    let finalSender: Wallet | null = null;
    let finalReceiver: Wallet | null = null;

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      const orderedUserIds =
        senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

      const lockedWallets = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId IN (:...userIds)', { userIds: orderedUserIds })
        .orderBy('wallet.userId', 'ASC')
        .getMany();

      let senderWallet = lockedWallets.find((w) => Number(w.userId) === senderId) ?? null;
      if (!senderWallet) {
        throw new BadRequestException('Sender wallet not found');
      }

      const derivedSpendable =
        Number(senderWallet.balanceCents) - Number(senderWallet.cashoutAvailableCents);

      if (Number(senderWallet.balanceCents) < amountCents) {
        throw new BadRequestException('Insufficient balance (no-debt enforced)');
      }

      senderWallet.balanceCents = Number(senderWallet.balanceCents) - amountCents;
      senderWallet.spendableBalanceCents =
        Number(senderWallet.spendableBalanceCents) - amountCents;

      senderWallet = await walletRepo.save(senderWallet);

      const savedSenderTx = await txRepo.save(
        txRepo.create({
          walletId: senderWallet.id,
          type: 'transfer_out',
          amountCents: -amountCents,
          metadata: { toUserId: receiverId },
        }),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: senderWallet.userId,
          venueId: null,
          direction: 'debit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number(savedSenderTx.id),
          metadata: {
            walletTransactionType: 'transfer_out',
            toUserId: receiverId,
          },
        }),
      );

      let receiverWallet =
        lockedWallets.find((w) => Number(w.userId) === receiverId) ?? null;

      if (!receiverWallet) {
        receiverWallet = walletRepo.create({
          userId: receiverId,
          balanceCents: 0,
          spendableBalanceCents: 0,
          cashoutAvailableCents: 0,
        });
      }

      receiverWallet.balanceCents = Number(receiverWallet.balanceCents) + amountCents;
      receiverWallet.spendableBalanceCents =
        Number(receiverWallet.spendableBalanceCents) + amountCents;

      receiverWallet = await walletRepo.save(receiverWallet);

      const savedReceiverTx = await txRepo.save(
        txRepo.create({
          walletId: receiverWallet.id,
          type: 'transfer_in',
          amountCents,
          metadata: { fromUserId: senderId },
        }),
      );

      await ledgerRepo.save(
        ledgerRepo.create({
          userId: receiverWallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number(savedReceiverTx.id),
          metadata: {
            walletTransactionType: 'transfer_in',
            fromUserId: senderId,
          },
        }),
      );

      finalSender = senderWallet;
      finalReceiver = receiverWallet;
    });

    if (finalSender) this.emitWalletUpdated(finalSender);
    if (finalReceiver) this.emitWalletUpdated(finalReceiver);
  }

  // ==================================================
  // DEV/REPAIR: Unlock spendable by moving from cashoutAvailable -> spendable
  // Invariant preserved: balance stays the same
  // ==================================================
  async unlockSpendableBalance(userId: number, amountCents: number) {
    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    let wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.cashoutAvailableCents) < amountCents) {
      throw new BadRequestException('Insufficient cashout balance');
    }

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIX: avoid bigint-string concat/implicit types
    wallet.balanceCents = Number(wallet.balanceCents) - amountCents;
wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) - amountCents;
wallet.spendableBalanceCents =
  Number(wallet.balanceCents) - Number(wallet.cashoutAvailableCents);

    wallet = await this.walletRepo.save(wallet);

    const savedTx = await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'unlock_spendable',
        amountCents,
        metadata: { via: 'unlock_spendable' },
      }),
    );

    await this.dataSource.transaction(async (manager) => {
      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'unlock_spendable',
            via: 'unlock_spendable',
          },
        }),
      );
    });

    this.emitWalletUpdated(wallet);
    return wallet;
  }

  // ==================================================
  // CASHOUT FLOW
  // ==================================================
  async cashout(userId: number, amountCents: number): Promise<CashoutRequest> {
    if (amountCents <= 0) {
      throw new BadRequestException('Cashout amount must be positive');
    }

    const bankInfo = await this.bankInfoService.getForUser(userId);
    if (!bankInfo) {
      throw new BadRequestException('Bank info required before cashout.');
    }

    let updatedWallet: Wallet | null = null;

    const savedCashout = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const txRepo = manager.getRepository(WalletTransaction);

      const wallet = await walletRepo
  .createQueryBuilder('wallet')
  .setLock('pessimistic_write')
  .where('wallet.userId = :userId', { userId })
  .getOne();
      if (!wallet) throw new BadRequestException('Wallet not found');

      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ HARD GATE: only 1 PENDING cashout allowed per wallet
      const pendingCount = await cashoutRepo.count({
        where: { wallet: { id: wallet.id }, status: 'PENDING' as any } as any,
      });
      if (pendingCount > 0) {
        throw new BadRequestException('pending_cashout_exists');
      }

      if (Number(wallet.cashoutAvailableCents) < amountCents) {
        throw new BadRequestException('Insufficient cashout balance');
      }

      // preserve chk_wallet_balance_consistency
      wallet.balanceCents = Number(wallet.balanceCents) - amountCents;
wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) - amountCents;
wallet.spendableBalanceCents =
  Number(wallet.balanceCents) - Number(wallet.cashoutAvailableCents);
      const savedWallet = await walletRepo.save(wallet);
      const cashout = cashoutRepo.create({
        walletId: savedWallet.id,
        amountCents,
        status: 'PENDING',
        failureReason: null,
        destinationLast4: bankInfo.accountLast4 ?? null,
      });

      const result = await cashoutRepo.save(cashout);

      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: savedWallet.id,
          type: 'cashout_reserved',
          amountCents: -amountCents,
          metadata: {
            cashoutId: result.id,
            destinationLast4: bankInfo.accountLast4 ?? null,
            reason: 'cashout_request',
            via: 'wallet_cashout',
          },
        }),
      );


      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: savedWallet.userId,
          venueId: null,
          direction: 'debit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_reserved',
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
  async getCashoutForUserById(userId: number, cashoutId: number): Promise<CashoutDto> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const cashout = await this.cashoutRepo.findOne({
      where: { id: cashoutId, wallet: { id: wallet.id } },
      relations: ['wallet'],
    });

    if (!cashout) {
      throw new NotFoundException('Cashout not found');
    }

    return this.toCashoutDto(cashout);
  }

  // ==================================================
  // M6: Cashouts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â canonical listing (status filter + normalized output)
  // ==================================================
  private normalizeCashoutStatus(input?: string | null): CashoutStatusCanonical | 'ALL' {
    const v = String(input || '').trim().toLowerCase();
    if (!v) return 'ALL';
    if (v === 'pending') return 'PENDING';
    if (v === 'completed') return 'COMPLETED';
    if (v === 'failed') return 'FAILED';
    return 'ALL';
  }

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ HARDEN: prevent RangeError ("Invalid time value") from legacy/invalid createdAt values
  private safeIsoDate(value: any): string {
    try {
      if (!value) return new Date().toISOString();
      const d = value instanceof Date ? value : new Date(value);
      if (!Number.isFinite(d.getTime())) return new Date().toISOString();
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private toCashoutDto(c: CashoutRequest): CashoutDto {
    const status =
      (String(c?.status || '').toUpperCase() as CashoutStatusCanonical) || 'PENDING';

    return {
      id: Number(c.id),
      status: status === 'PENDING' || status === 'COMPLETED' || status === 'FAILED' ? status : 'PENDING',
      amountCents: Number(c.amountCents ?? 0),
      failureReason: c.failureReason ?? null,
      destinationLast4: (c as any).destinationLast4 ?? null,
      createdAt: this.safeIsoDate((c as any).createdAt),
      retryOfCashoutId: (c as any).retryOfCashoutId ?? null,
    };
  }

  async listCashoutsCanonical(userId: number, statusQuery?: string | null): Promise<CashoutListResponse> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    const normalized = this.normalizeCashoutStatus(statusQuery);

    if (!wallet) {
      return { items: [], meta: { count: 0, status: normalized } };
    }

    const whereBase: any = { wallet: { id: wallet.id } };
    const where = normalized === 'ALL' ? whereBase : { ...whereBase, status: normalized };

    const rows = await this.cashoutRepo.find({
      where,
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
    });

    const items = (rows || []).map((r) => this.toCashoutDto(r));
    return { items, meta: { count: items.length, status: normalized } };
  }

  // ==================================================
  // DEV: Add cashout-ready balance directly (enum-safe)
  // ==================================================
  async devAddCashoutBalance(userId: number, amountCents: number): Promise<Wallet> {
    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    let finalWallet: Wallet | null = null;

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);
      const ledgerRepo = manager.getRepository(LedgerEntry);

      let wallet = await walletRepo.findOne({ where: { userId } });
      if (!wallet) {
        wallet = walletRepo.create({
          userId,
          balanceCents: 0,
          spendableBalanceCents: 0,
          cashoutAvailableCents: 0,
        });
        wallet = await walletRepo.save(wallet);
      }

      // preserve chk_wallet_balance_consistency
      wallet.balanceCents = Number(wallet.balanceCents) + amountCents;
      wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) + amountCents;
      wallet.spendableBalanceCents = Number(wallet.balanceCents) - Number(wallet.cashoutAvailableCents);

      wallet = await walletRepo.save(wallet);

      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'deposit',
          amountCents,
          metadata: { dev: true, reason: 'dev_add_cashout_balance' },
        }),
      );

      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'deposit',
            dev: true,
            reason: 'dev_add_cashout_balance',
          },
        }),
      );

      finalWallet = wallet;
    });

    if (finalWallet) this.emitWalletUpdated(finalWallet);
    return finalWallet!;
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
    if (cashout.status !== 'PENDING') {
      throw new BadRequestException('Only pending cashouts can be completed');
    }
    if (!cashout.wallet) {
      throw new BadRequestException('Cashout wallet relation missing');
    }

    const ownerBank = await this.ownerBankInfoRepo.findOne({
      where: { userId: cashout.wallet.userId },
    });

    if (!ownerBank?.stripeAccountId) {
      throw new BadRequestException('owner_stripe_account_missing');
    }
    if (!ownerBank.stripePayoutsEnabled) {
      throw new BadRequestException('owner_stripe_payouts_not_enabled');
    }

    const amountCents = Number(cashout.amountCents);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('Invalid cashout amount');
    }

    const allocation =
      await this.payoutAllocationService.resolveSingleSourceForCashout(cashout.id);

    const paymentIntentId = allocation.paymentIntentId;
    const sourceTransactionId = allocation.stripeChargeId;


    const saved = await this.dataSource.transaction(async (manager) => {

      const cashoutRepo = manager.getRepository(CashoutRequest);
      const txRepo = manager.getRepository(WalletTransaction);
      const payoutSourceRepo = manager.getRepository(PayoutSource);

      const fresh = await cashoutRepo.findOne({
        where: { id: cashoutId },
        relations: ['wallet'],
      });

      if (!fresh) throw new NotFoundException('Cashout not found');
      if (fresh.status === 'COMPLETED') return fresh;
      if (fresh.status !== 'PENDING') {
        throw new BadRequestException('Only pending cashouts can be completed');
      }

      const idempotencyKey = `cashout_complete_${fresh.id}_${sourceTransactionId}`;

      const transfer = await this.stripe.transfers.create(
        {
          amount: amountCents,
          currency: 'usd',
          destination: ownerBank.stripeAccountId,
          source_transaction: sourceTransactionId,
          metadata: {
            cashoutId: String(fresh.id),
            walletId: String(fresh.walletId),
            userId: String(fresh.wallet.userId),
            purpose: 'owner_cashout',
            paymentIntentId,
            sourceTransactionId,
          },
        },
        {
          idempotencyKey,
        },
      );

      fresh.status = 'COMPLETED';
      fresh.failureReason = null;
      fresh.idempotencyKey = idempotencyKey;
      fresh.stripeTransferId = transfer.id;
      fresh.stripeAccountId = ownerBank.stripeAccountId;
      fresh.providerStatus = transfer.object;
      fresh.processedAt = new Date();
      fresh.settledAt = new Date();

      const updated = await cashoutRepo.save(fresh);

      await payoutSourceRepo.save(
        payoutSourceRepo.create({
          cashoutId: updated.id,
          stripeChargeId: sourceTransactionId,
          paymentIntentId,
          amountCents,
        }),
      );

      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: updated.walletId,
          type: 'cashout_settled',
          amountCents,
          metadata: {
            cashoutId: updated.id,
            stripeTransferId: transfer.id,
            stripeAccountId: ownerBank.stripeAccountId,
            via: 'admin_complete_cashout',
          },
        }),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: updated.wallet.userId,
          venueId: null,
          direction: 'debit',
          amountCents,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_settled',
            cashoutId: updated.id,
            stripeTransferId: transfer.id,
            stripeAccountId: ownerBank.stripeAccountId,
            via: 'admin_complete_cashout',
          },
        }),
      );

      return updated;
    });

    this.websocketGateway.emitCashoutUpdated(saved);
    return saved;
  }

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ UPDATED (PATCH): explicit QueryRunner txn to eliminate TransactionNotStartedError under concurrency (SQLite)
  async adminFailCashout(cashoutId: number, failureReason: string): Promise<CashoutRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let txnStarted = false;
    try {
      await queryRunner.startTransaction();
      txnStarted = true;

      const manager = queryRunner.manager;
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

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

      // ?? FETCH CASHOUT (FIX)
      // Refund ONCE (only the winner reaches here)
      const wallet = await walletRepo.findOne({ where: { id: cashout.walletId } });
      if (!wallet) throw new BadRequestException('Wallet not found');

      const amount = Number(cashout.amountCents);



      // preserve chk_wallet_balance_consistency
      wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) + amount;
      wallet.spendableBalanceCents = Number(wallet.spendableBalanceCents) - amount;
      await walletRepo.save(wallet);
      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Ledger refund entry
      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout_reserved',
          amountCents: amount, // +amount = refund reversal for admin fail
          metadata: {
            reason: 'cashout_fail_refund',
            cashoutId: cashout.id,
            via: 'admin_fail',
            failureReason: reason,
          },
        }),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents: amount,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_reserved',
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
      const latestWallet = await this.walletRepo.findOne({ where: { id: updated.walletId } });
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
  async adminRepairFailedCashoutRefund(cashoutId: number): Promise<CashoutRequest> {
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
        where: { walletId: cashout.walletId as any, type: 'cashout_reserved' as any } as any,
        order: { createdAt: 'ASC' as any },
      });

      const rows = (all || []).filter((r: any) => {
        const m = r?.metadata;
        return m && Number(m.cashoutId) === Number(cashout.id);
      });

      if (!rows.length) {
        throw new BadRequestException('No ledger rows found for this cashout');
      }

      const sum = rows.reduce((s: number, r: any) => s + Number(r.amountCents || 0), 0);

      if (sum === 0 || sum === amount) {
        return cashout;
      }

      if (sum !== -amount) {
        throw new BadRequestException(
          `Not a debit-only FAILED cashout (sum=${sum}, amount=${amount})`,
        );
      }

      const wallet = await walletRepo.findOne({ where: { id: cashout.walletId } });
      if (!wallet) throw new BadRequestException('Wallet not found');

      // preserve chk_wallet_balance_consistency
      wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) + amount;
      wallet.spendableBalanceCents = Number(wallet.spendableBalanceCents) - amount;
      await walletRepo.save(wallet);
      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout_reserved',
          amountCents: amount,
          metadata: {
            reason: 'cashout_repair_refund',
            cashoutId: cashout.id,
            via: 'repair_endpoint',
            failureReason: cashout.failureReason ?? 'repaired',
          },
        } as any),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents: amount,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_reserved',
            reason: 'cashout_repair_refund',
            cashoutId: cashout.id,
            via: 'repair_endpoint',
            failureReason: cashout.failureReason ?? 'repaired',
          },
        }),
      );

      const updated = await cashoutRepo.findOne({ where: { id: cashoutId } });
      if (!updated) throw new NotFoundException('Cashout not found');

      return updated;
    });

    const wallet = await this.walletRepo.findOne({ where: { id: saved.walletId } });
    if (wallet) this.emitWalletUpdated(wallet);

    this.websocketGateway.emitCashoutUpdated(saved);
    return saved;
  }

  // ==================================================
  // OWNER: Cancel own cashout (PENDING ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ FAILED + refund)
  // ==================================================
  async cancelCashout(userId: number, cashoutId: number): Promise<CashoutRequest> {
    const savedCashout = await this.dataSource.transaction(async (manager) => {
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      const cashout = await cashoutRepo.findOne({
        where: { id: cashoutId },
        relations: ['wallet'],
      });

      if (!cashout) throw new NotFoundException('Cashout not found');
      if (!cashout.wallet || cashout.wallet.userId !== userId) {
        throw new BadRequestException('Cashout does not belong to this user');
      }

      const res = await cashoutRepo.update(
        { id: cashoutId, status: 'PENDING' as any },
        { status: 'FAILED' as any, failureReason: 'Cancelled by owner' },
      );

      if (!res.affected) {
        throw new BadRequestException('Only pending cashouts can be cancelled');
      }

      const wallet = await walletRepo.findOne({ where: { id: cashout.walletId } });
      if (!wallet) throw new BadRequestException('Wallet not found');

      const amount = Number(cashout.amountCents);



      // preserve chk_wallet_balance_consistency
      wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) + amount;
      wallet.spendableBalanceCents = Number(wallet.spendableBalanceCents) - amount;
      await walletRepo.save(wallet);
      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout_reserved',
          amountCents: amount,
          metadata: {
            reason: 'cashout_cancel_refund',
            cashoutId: cashout.id,
            via: 'cancel_endpoint',
          },
        } as any),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents: amount,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_reserved',
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

    const wallet = await this.walletRepo.findOne({ where: { id: savedCashout.walletId } });
    if (wallet) this.emitWalletUpdated(wallet);

    this.websocketGateway.emitCashoutUpdated(savedCashout);
    return savedCashout;
  }

  // ==================================================
  // OWNER: Retry failed cashout (creates new PENDING)
  // ==================================================
  async retryCashout(userId: number, cashoutId: number): Promise<CashoutRequest> {
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

      const existingRetry = await cashoutRepo.findOne({
        where: { retryOfCashoutId: original.id as any } as any,
      });
      if (existingRetry) {
        throw new BadRequestException('retry_already_exists_for_cashout');
      }

      const wallet = await walletRepo.findOne({ where: { id: original.walletId } });
      if (!wallet) throw new BadRequestException('Wallet not found');
      const pendingCashoutForWallet = await cashoutRepo.findOne({
        where: { walletId: wallet.id, status: 'PENDING' } as any,
      });
      if (pendingCashoutForWallet) {
        throw new BadRequestException('pending_cashout_already_exists_for_wallet');
      }

      if (Number(wallet.cashoutAvailableCents) < amount) {
        throw new BadRequestException('Insufficient cashout balance');
      }

      wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) - amount;
      wallet.spendableBalanceCents =
        Number(wallet.balanceCents) - Number(wallet.cashoutAvailableCents);


await walletRepo.save(wallet);
      const retryPartial: DeepPartial<CashoutRequest> = {
        walletId: wallet.id,
        amountCents: amount,
        status: 'PENDING',
        failureReason: null,
        destinationLast4: (original as any).destinationLast4 ?? null,
        retryOfCashoutId: original.id as any,
      };

      const retry = await cashoutRepo.save(cashoutRepo.create(retryPartial));

      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout_reserved',
          amountCents: -amount,
          metadata: {
            cashoutId: retry.id,
            reason: 'cashout_request',
            via: 'wallet_cashout_retry',
            retryOfCashoutId: original.id,
            destinationLast4: (original as any).destinationLast4 ?? null,
          },
        }),
      ) as WalletTransaction;

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'debit',
          amountCents: amount,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_reserved',
            cashoutId: retry.id,
            reason: 'cashout_request',
            via: 'wallet_cashout_retry',
            retryOfCashoutId: original.id,
            destinationLast4: (original as any).destinationLast4 ?? null,
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

    const latestCompleted = completedCashouts.length ? completedCashouts[0] : null;

    const latestCompletedCashout = latestCompleted
      ? {
          id: latestCompleted.id,
          amountCents: Number(latestCompleted.amountCents),
          status: latestCompleted.status,
          destinationLast4: (latestCompleted as any).destinationLast4 ?? null,
          failureReason: latestCompleted.failureReason,
          createdAt: (latestCompleted as any).createdAt,
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
      where: { wallet: { id: wallet.id }, status: 'PENDING' as any } as any,
      order: { createdAt: 'ASC' },
    });

    if (!next) return null;

    return {
      id: next.id,
      amountCents: Number(next.amountCents),
      status: next.status,
      destinationLast4: (next as any).destinationLast4 ?? null,
      createdAt: (next as any).createdAt,
    };
  }

  // ==================================================
  // ADMIN FILTERS
  // ==================================================
  async getCashoutsByStatus(status: CashoutStatus) {
    return this.cashoutRepo.find({
      where: { status } as any,
      order: { createdAt: 'DESC' },
    });
  }

  // ==================================================
  // ADMIN: Reverse completed cashout (POST-SETTLEMENT FIX)
  // ==================================================
  async adminReverseCashout(cashoutId: number): Promise<CashoutRequest> {
    return this.dataSource.transaction(async (manager) => {
      const cashoutRepo = manager.getRepository(CashoutRequest);
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      const cashout = await cashoutRepo.findOne({
        where: { id: cashoutId },
      });

      if (!cashout) throw new NotFoundException('Cashout not found');

      if (cashout.status !== 'COMPLETED') {
        throw new BadRequestException('Only completed cashouts can be reversed');
      }

      const wallet = await walletRepo.findOne({
        where: { id: cashout.walletId },
      });

      if (!wallet) throw new BadRequestException('Wallet not found');

      const amount = Number(cashout.amountCents);
      // -------------------------------------------
      // STRIPE TRANSFER REVERSAL (CRITICAL)
      // -------------------------------------------
      if (cashout.stripeTransferId) {
        try {
          await this.stripe.transfers.createReversal(
            cashout.stripeTransferId,
            {
              amount,
              metadata: {
                cashoutId: String(cashout.id),
                reason: 'admin_reverse',
              },
            },
          );
        } catch (err: any) {
          throw new BadRequestException(
            `Stripe reversal failed: ${err?.message || err}`
          );
        }
      }



      // Prevent double reversal (idempotency)
      const existing = await txRepo.find({
  where: {
    walletId: wallet.id,
    type: 'cashout_reversed' as any,
  } as any,
  order: { createdAt: 'DESC' as any },
});

const alreadyReversed = (existing || []).some(
  (row: any) => Number(row?.metadata?.cashoutId) === Number(cashout.id),
);

if (alreadyReversed) return cashout;

      // Ledger reversal
      const savedTx = await txRepo.save(
        txRepo.create({
          walletId: wallet.id,
          type: 'cashout_reversed',
          amountCents: -amount,
          metadata: {
            cashoutId: cashout.id,
            reason: 'admin_reverse',
          },
        }),
      );

      const ledgerRepo = manager.getRepository(LedgerEntry);
      await ledgerRepo.save(
        ledgerRepo.create({
          userId: wallet.userId,
          venueId: null,
          direction: 'credit',
          amountCents: amount,
          source: 'wallet',
          referenceType: 'wallet_transaction',
          referenceId: Number((savedTx as any).id),
          metadata: {
            walletTransactionType: 'cashout_reversed',
            cashoutId: cashout.id,
            reason: 'admin_reverse',
          },
        }),
      );

      // Bucket correction (CRITICAL)
      wallet.balanceCents = Number(wallet.balanceCents) + amount;
wallet.cashoutAvailableCents = Number(wallet.cashoutAvailableCents) + amount;
wallet.spendableBalanceCents =
  Number(wallet.balanceCents) - Number(wallet.cashoutAvailableCents);

await walletRepo.save(wallet);

      // Update status
      cashout.status = 'REVERSED' as any;
      (cashout as any).reversedAt = new Date();

      return cashoutRepo.save(cashout);
    });
  }
}




































