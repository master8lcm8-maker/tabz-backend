// src/modules/store-items/store-items.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StoreItem } from './store-item.entity';
import { StoreItemOrder } from './store-item-order.entity';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class StoreItemsService {
  constructor(
    @InjectRepository(StoreItem)
    private readonly itemsRepo: Repository<StoreItem>,

    @InjectRepository(StoreItemOrder)
    private readonly ordersRepo: Repository<StoreItemOrder>,

    private readonly walletService: WalletService,
  ) {}

  // ---------- Items (core helpers) ----------

  async listActiveItemsForVenue(venueId: number): Promise<StoreItem[]> {
    return this.itemsRepo.find({
      where: { venueId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async getItemById(id: number): Promise<StoreItem> {
    const item = await this.itemsRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Store item not found');
    }
    return item;
  }

  // ---------- Orders (core helper) ----------

  /**
   * Create an order and charge buyer's wallet.
   * Used when someone buys any store item (e.g. diapers).
   */
  async createOrderAndChargeWallet(params: {
    buyerId: number;
    venueOwnerId: number | null;
    itemId: number;
    quantity: number;
    platformFeePercent: number;
  }): Promise<StoreItemOrder> {
    const { buyerId, venueOwnerId, itemId, quantity, platformFeePercent } = params;

    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Quantity must be positive.');
    }

    const item = await this.getItemById(itemId);
    const totalAmountCents = item.priceCents * quantity;

    // Charge wallet with payout split
    await this.walletService.chargeStoreItemPurchase(
      buyerId,
      venueOwnerId,
      totalAmountCents,
      platformFeePercent,
    );

    // Create single StoreItemOrder entity
    const order = this.ordersRepo.create({
      buyerId,
      venueId: item.venueId,
      itemId: item.id,
      quantity,
      amountCents: totalAmountCents,
      status: 'completed',
    });

    return this.ordersRepo.save(order);
  }

  async listOrdersForBuyer(buyerId: number): Promise<StoreItemOrder[]> {
    return this.ordersRepo.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  async listOrdersForVenue(venueId: number): Promise<StoreItemOrder[]> {
    return this.ordersRepo.find({
      where: { venueId },
      order: { createdAt: 'DESC' },
    });
  }

  // ========== METHODS EXPECTED BY CONTROLLER ==========

  // These method names come directly from the TS errors.
  // Signatures use `any` where necessary so they are compatible
  // with whatever DTOs the controller passes.

  // --- Items CRUD ---

  async createItem(dto: any): Promise<StoreItem> {
    // dto is typically CreateStoreItemDto
    const item = this.itemsRepo.create(dto);
    return this.itemsRepo.save(item);
  }

  async findAllItems(): Promise<StoreItem[]> {
    return this.itemsRepo.find({ order: { createdAt: 'ASC' } });
  }

  async findOneItem(id: number): Promise<StoreItem> {
    return this.getItemById(id);
  }

  async updateItem(id: number, dto: any): Promise<StoreItem> {
    // dto is typically UpdateStoreItemDto (partial)
    const preload = await this.itemsRepo.preload({
      id,
      ...dto,
    });

    if (!preload) {
      throw new NotFoundException('Store item not found');
    }

    return this.itemsRepo.save(preload);
  }

  async removeItem(id: number): Promise<void> {
    await this.itemsRepo.delete(id);
  }

  // --- Orders / venue views ---

  async getVenueOrdersForUser(
    venueId: number,
    userId: number,
  ): Promise<StoreItemOrder[]> {
    // orders for a specific buyer at a venue
    return this.ordersRepo.find({
      where: { venueId, buyerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateOrderStatus(
    orderId: number,
    status: string,
  ): Promise<StoreItemOrder> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = status;
    return this.ordersRepo.save(order);
  }
}
