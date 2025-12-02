// src/modules/store-items/store-items.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

  // ---------- Items ----------

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

  // ---------- Orders ----------

  /**
   * Create an order and charge buyer's wallet.
   * This is what TABZ uses when someone buys diapers / items.
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

    // Create a single order entity (NOT an array)
    const order = this.ordersRepo.create({
      buyerId,
      venueId: item.venueId,
      itemId: item.id,
      quantity,
      amountCents: totalAmountCents,
      status: 'completed',
    });

    // save returns StoreItemOrder (single), not StoreItemOrder[]
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
}
