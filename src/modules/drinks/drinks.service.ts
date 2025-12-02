import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  DrinkOrder,
  DrinkOrderStatus,
} from './entities/drink-order.entity';
import { Venue } from '../venues/venue.entity';
import { randomBytes } from 'crypto';
import { WalletService } from '../../wallet/wallet.service';

const DRINK_PLATFORM_FEE_PERCENT = 20; // TABZ fee on drinks

@Injectable()
export class DrinksService {
  constructor(
    @InjectRepository(DrinkOrder)
    private readonly drinkRepo: Repository<DrinkOrder>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * USER SIDE — SEND A DRINK
   */
  async createOrder(params: {
    senderId: number;
    venueId: number;
    drinkName: string;
    amountCents: number;
    currency?: string;
    message?: string;
    recipientId?: number;
    platformFeePercent?: number;
  }): Promise<DrinkOrder> {
    const {
      senderId,
      venueId,
      drinkName,
      amountCents,
      currency = 'USD',
      message,
      recipientId,
      platformFeePercent,
    } = params;

    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Amount must be positive.');
    }

    const venue = await this.venueRepo.findOne({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    const feePercent =
      typeof platformFeePercent === 'number'
        ? platformFeePercent
        : DRINK_PLATFORM_FEE_PERCENT;

    // Charge the sender wallet and credit venue owner
    await this.walletService.spendWithPayout(
      senderId,
      venue.ownerId ?? null,
      amountCents,
      feePercent,
    );

    const redemptionCode = randomBytes(16).toString('hex');

    const order = this.drinkRepo.create({
      senderId,
      recipientId: recipientId ?? null,
      venue,
      drinkName,
      amountCents,
      currency,
      message,
      status: DrinkOrderStatus.PENDING,
      redemptionCode,
    });

    return this.drinkRepo.save(order);
  }

  /**
   * USER SIDE — DRINKS I SENT
   */
  async getOrdersForUser(userId: number): Promise<DrinkOrder[]> {
    return this.drinkRepo.find({
      where: { senderId: userId },
      relations: ['venue'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * VENUE SIDE — DRINK ORDERS FOR ALL VENUES OWNED BY THIS USER
   */
  async getOrdersForVenueOwner(ownerId: number): Promise<DrinkOrder[]> {
    const venues = await this.venueRepo.find({ where: { ownerId } });

    if (!venues.length) {
      return [];
    }

    const venueIds = venues.map((v) => v.id);

    return this.drinkRepo.find({
      where: {
        venue: { id: In(venueIds) },
      },
      relations: ['venue'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * STAFF SIDE — REDEEM BY CODE
   */
  async redeemOrderByCode(redemptionCode: string): Promise<DrinkOrder> {
    if (!redemptionCode) {
      throw new BadRequestException('Redemption code is required');
    }

    const order = await this.drinkRepo.findOne({
      where: { redemptionCode },
      relations: ['venue'],
    });

    if (!order) {
      throw new NotFoundException('Drink order not found');
    }

    if (order.status === DrinkOrderStatus.REDEEMED) {
      throw new BadRequestException('Drink order already redeemed');
    }

    order.status = DrinkOrderStatus.REDEEMED;
    order.redeemedAt = new Date();

    return this.drinkRepo.save(order);
  }

  // Backwards-compatible helpers
  async findMyOrders(userId: number): Promise<DrinkOrder[]> {
    return this.getOrdersForUser(userId);
  }

  async redeemByCode(redemptionCode: string): Promise<DrinkOrder> {
    return this.redeemOrderByCode(redemptionCode);
  }
}
