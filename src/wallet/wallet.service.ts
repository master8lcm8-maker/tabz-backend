// src/wallet/wallet.service.ts
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  // ---------- Helpers ----------

  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    const n = Number(value);
    if (isNaN(n)) {
      throw new BadRequestException(`Invalid bigint value: ${value}`);
    }
    return n;
  }

  private normalizeWallet(wallet: Wallet) {
    wallet.balanceCents = this.toNumber(wallet.balanceCents);
    wallet.spendableBalanceCents = this.toNumber(wallet.spendableBalanceCents);
    wallet.cashoutAvailableCents = this.toNumber(wallet.cashoutAvailableCents);
  }

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

    this.normalizeWallet(wallet);
    return wallet;
  }

  // ---------- Public API ----------

  // GET /wallet/summary
  async getSummary(userId: number): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(userId);
    this.normalizeWallet(wallet);
    return wallet;
  }

  // POST /wallet/deposit
  async deposit(userId: number, amountCents: number): Promise<Wallet> {
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Deposit amount must be positive.');
    }

    const wallet = await this.getOrCreateWallet(userId);
    this.normalizeWallet(wallet);

    wallet.balanceCents += amountCents;
    wallet.spendableBalanceCents += amountCents;

    await this.walletRepo.save(wallet);

    // optional: record transaction
    await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'deposit',
        amountCents,
        metadata: null,
      }),
    );

    return wallet;
  }

  // SIMPLE spend (no payout)
  async spend(userId: number, amountCents: number): Promise<Wallet> {
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Spend amount must be positive.');
    }

    const wallet = await this.getOrCreateWallet(userId);
    this.normalizeWallet(wallet);

    if (wallet.spendableBalanceCents < amountCents) {
      throw new BadRequestException('Insufficient spendable balance.');
    }

    wallet.spendableBalanceCents -= amountCents;

    await this.walletRepo.save(wallet);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'spend',
        amountCents,
        metadata: null,
      }),
    );

    return wallet;
  }

  /**
   * CORE: Spend from buyer and (optionally) credit venue owner.
   *
   * - buyerId: user paying
   * - venueOwnerId: owner who should receive revenue (can be same as buyer)
   * - amountCents: total amount paid
   * - platformFeePercent: TABZ fee (0–100)
   *
   * Buyer: spendableBalanceCents -= amountCents
   * Venue owner: cashoutAvailableCents += (amountCents - fee)
   */
  async spendWithPayout(
    buyerId: number,
    venueOwnerId: number | null | undefined,
    amountCents: number,
    platformFeePercent: number,
  ): Promise<{ buyer: Wallet; venueOwner?: Wallet }> {
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Spend amount must be positive.');
    }

    if (platformFeePercent < 0 || platformFeePercent > 100) {
      throw new BadRequestException('Invalid platform fee percent.');
    }

    const buyer = await this.getOrCreateWallet(buyerId);
    this.normalizeWallet(buyer);

    if (buyer.spendableBalanceCents < amountCents) {
      throw new BadRequestException('Insufficient spendable balance.');
    }

    const fee = Math.floor((amountCents * platformFeePercent) / 100);
    const venueShare = amountCents - fee;

    // CASE 1: No venue owner or no share -> just spend from buyer
    if (!venueOwnerId || venueShare <= 0) {
      buyer.spendableBalanceCents -= amountCents;
      await this.walletRepo.save(buyer);

      await this.txRepo.save(
        this.txRepo.create({
          walletId: buyer.id,
          type: 'spend_no_payout',
          amountCents,
          metadata: { fee },
        }),
      );

      return { buyer };
    }

    // CASE 2: Buyer and venue owner are the SAME user
    if (venueOwnerId === buyerId) {
      buyer.spendableBalanceCents -= amountCents;
      buyer.cashoutAvailableCents += venueShare;
      await this.walletRepo.save(buyer);

      await this.txRepo.save(
        this.txRepo.create({
          walletId: buyer.id,
          type: 'spend_self_payout',
          amountCents,
          metadata: { fee, venueShare },
        }),
      );

      return { buyer };
    }

    // CASE 3: Buyer and venue owner are different users
    const venueWallet = await this.getOrCreateWallet(venueOwnerId);
    this.normalizeWallet(venueWallet);

    buyer.spendableBalanceCents -= amountCents;
    venueWallet.cashoutAvailableCents += venueShare;

    await this.walletRepo.save(buyer);
    await this.walletRepo.save(venueWallet);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: buyer.id,
        type: 'spend_with_payout',
        amountCents,
        metadata: {
          fee,
          venueShare,
          venueOwnerId,
          venueWalletId: venueWallet.id,
        },
      }),
    );

    return { buyer, venueOwner: venueWallet };
  }

  // wrapper used by StoreItemsService
  async chargeStoreItemPurchase(
    buyerId: number,
    venueOwnerId: number | null,
    amountCents: number,
    platformFeePercent: number,
  ): Promise<void> {
    await this.spendWithPayout(buyerId, venueOwnerId, amountCents, platformFeePercent);
  }

  // POST /wallet/transfer
  async transfer(
    senderId: number,
    receiverId: number,
    amountCents: number,
  ): Promise<{ sender: Wallet; receiver: Wallet }> {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot transfer to yourself.');
    }

    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Transfer amount must be positive.');
    }

    const sender = await this.getOrCreateWallet(senderId);
    const receiver = await this.getOrCreateWallet(receiverId);

    this.normalizeWallet(sender);
    this.normalizeWallet(receiver);

    if (sender.spendableBalanceCents < amountCents) {
      throw new BadRequestException('Insufficient balance.');
    }

    sender.spendableBalanceCents -= amountCents;
    receiver.spendableBalanceCents += amountCents;

    await this.walletRepo.save(sender);
    await this.walletRepo.save(receiver);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: sender.id,
        type: 'transfer_out',
        amountCents,
        metadata: { receiverId },
      }),
    );

    await this.txRepo.save(
      this.txRepo.create({
        walletId: receiver.id,
        type: 'transfer_in',
        amountCents,
        metadata: { senderId },
      }),
    );

    return { sender, receiver };
  }

  // POST /wallet/cashout
  async cashout(userId: number, amountCents: number): Promise<Wallet> {
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Cashout amount must be positive.');
    }

    const wallet = await this.getOrCreateWallet(userId);
    this.normalizeWallet(wallet);

    if (wallet.cashoutAvailableCents < amountCents) {
      throw new BadRequestException('Not enough available for cashout.');
    }

    wallet.cashoutAvailableCents -= amountCents;

    await this.walletRepo.save(wallet);

    await this.txRepo.save(
      this.txRepo.create({
        walletId: wallet.id,
        type: 'cashout',
        amountCents,
        metadata: null,
      }),
    );

    return wallet;
  }

  // Convenience
  async getWalletForUser(userId: number): Promise<Wallet> {
    return this.getOrCreateWallet(userId);
  }
}
