// src/modules/store-items/store-items.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

import { StoreItem } from './store-item.entity';
import { StoreItemOrder } from './store-item-order.entity';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class StoreItemsService {
  private storeItemRepo: Repository<StoreItem>;
  private storeItemOrderRepo: Repository<StoreItemOrder>;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
  ) {
    this.storeItemRepo = this.dataSource.getRepository(StoreItem);
    this.storeItemOrderRepo = this.dataSource.getRepository(StoreItemOrder);

    // auto-fix schema on startup
    this.ensureSchemaSafe();
  }

  // ------------------------------------------------------------
  // AUTO-FIX DATABASE SCHEMA (THE ONLY PLACE WE TOUCH)
  // ------------------------------------------------------------
  private async ensureSchemaSafe(): Promise<void> {
    try {
      await this.dataSource.query(
        'ALTER TABLE store_items DROP CONSTRAINT IF EXISTS "FK_da515b332e8d73b129a18b8e1ef";',
      );
    } catch {}

    try {
      await this.dataSource.query(
        'ALTER TABLE store_item_orders ADD COLUMN IF NOT EXISTS "userId" integer;',
      );
    } catch {}

    try {
      await this.dataSource.query(
        'ALTER TABLE store_item_orders ADD COLUMN IF NOT EXISTS "itemSnapshot" jsonb;',
      );
    } catch {}

    try {
      await this.dataSource.query(
        'ALTER TABLE store_item_orders ADD COLUMN IF NOT EXISTS "amountCents" integer;',
      );
    } catch {}

    try {
      await this.dataSource.query(
        'ALTER TABLE store_item_orders DROP CONSTRAINT IF EXISTS "FK_467715a4e0fdf4fead2fcfe966b";',
      );
    } catch {}
  }

  // ------------------------------------------------------------
  // ITEMS CRUD
  // ------------------------------------------------------------
  async createItem(dto: {
    name: string;
    priceCents: number;
    venueId: number;
    metadata?: any;
  }): Promise<StoreItem> {
    if (!dto.name || !dto.priceCents || !dto.venueId) {
      throw new BadRequestException('Missing required fields for item.');
    }

    const entity = this.storeItemRepo.create({
      name: dto.name,
      priceCents: dto.priceCents,
      venueId: dto.venueId,
      metadata: dto.metadata ?? null,
    });

    return this.storeItemRepo.save(entity);
  }

  async findAllItems(): Promise<StoreItem[]> {
    return this.storeItemRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOneItem(id: number): Promise<StoreItem> {
    const item = await this.storeItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async updateItem(
    id: number,
    dto: Partial<{ name: string; priceCents: number; venueId: number; metadata: any }>,
  ): Promise<StoreItem> {
    const item = await this.findOneItem(id);
    Object.assign(item, dto);
    return this.storeItemRepo.save(item);
  }

  async removeItem(id: number): Promise<{ deleted: boolean }> {
    const res = await this.storeItemRepo.delete(id);
    return { deleted: !!res.affected };
  }

  // ------------------------------------------------------------
  // ORDERS
  // ------------------------------------------------------------
  async createOrderForUser(
    buyerId: number,
    body: { itemId: number; quantity: number },
  ): Promise<StoreItemOrder> {
    const { itemId, quantity } = body;

    if (!itemId || !quantity || quantity <= 0)
      throw new BadRequestException('Invalid itemId or quantity');

    const item = await this.storeItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const totalPriceCents = item.priceCents * quantity;

    // wallet charge
    await this.walletService.chargeStoreItemPurchase(
      buyerId,
      null,
      totalPriceCents,
      10,
    );

    // build order
    const order = this.storeItemOrderRepo.create({
      buyerId,
      userId: buyerId,
      itemId: item.id,
      venueId: item.venueId,
      quantity,
      amountCents: totalPriceCents,
      status: 'pending',
      itemSnapshot: {
        id: item.id,
        name: item.name,
        priceCents: item.priceCents,
        venueId: item.venueId,
        metadata: item.metadata ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });

    return this.storeItemOrderRepo.save(order);
  }

  async getVenueOrders(userId: number): Promise<StoreItemOrder[]> {
    return this.storeItemOrderRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getVenueOrdersForUser(userId: number): Promise<StoreItemOrder[]> {
    return this.getVenueOrders(userId);
  }

  async updateOrderStatus(orderId: number, status: string): Promise<StoreItemOrder> {
    if (!status) throw new BadRequestException('Status required');

    const order = await this.storeItemOrderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Order not found');

    order.status = status;
    return this.storeItemOrderRepo.save(order);
  }
}
