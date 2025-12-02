import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FoodOrder,
  FoodOrderStatus,
} from './entities/food-order.entity';
import { Venue } from '../venues/venue.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class FoodsService {
  constructor(
    @InjectRepository(FoodOrder)
    private readonly foodRepo: Repository<FoodOrder>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
  ) {}

  // CREATE / SEND A FOOD ORDER
  async createOrder(params: {
    senderId: number;
    venueId: number;
    foodName: string;
    amountCents: number;
    currency?: string;
    message?: string;
    recipientId?: number;
  }) {
    const {
      senderId,
      venueId,
      foodName,
      amountCents,
      currency = 'USD',
      message,
      recipientId,
    } = params;

    const venue = await this.venueRepo.findOne({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');

    const redemptionCode = randomBytes(24).toString('hex');

    const order = this.foodRepo.create({
      senderId,
      recipientId: recipientId ?? null,
      venue,
      foodName,
      amountCents,
      currency,
      message,
      status: FoodOrderStatus.PENDING,
      redemptionCode,
    });

    return this.foodRepo.save(order);
  }

  // LIST FOOD ORDERS I SENT
  async findMyOrders(userId: number) {
    return this.foodRepo.find({
      where: {
        senderId: userId,
      },
      relations: ['venue'],
      order: { createdAt: 'DESC' },
    });
  }

  // STAFF REDEEM FLOW (by QR / code)
  async redeemByCode(redemptionCode: string) {
    const order = await this.foodRepo.findOne({
      where: { redemptionCode },
      relations: ['venue'],
    });

    if (!order) {
      throw new NotFoundException('Food order not found');
    }

    if (order.status !== FoodOrderStatus.PENDING) {
      throw new BadRequestException('Food order is not pending');
    }

    order.status = FoodOrderStatus.REDEEMED;
    order.redeemedAt = new Date();

    return this.foodRepo.save(order);
  }
}
