// src/modules/store-items/store-items.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { StoreItem } from './store-item.entity';
import { StoreItemOrder } from './store-item-order.entity';
import { WalletService } from '../../wallet/wallet.service';

// ✅ websocket gateway for realtime events
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class StoreItemsService {
  private readonly logger = new Logger(StoreItemsService.name);

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(StoreItem)
    private readonly storeItemRepo: Repository<StoreItem>,

    @InjectRepository(StoreItemOrder)
    private readonly storeItemOrderRepo: Repository<StoreItemOrder>,

    private readonly walletService: WalletService,

    // ✅ 5th dependency – this is what Nest error is about (fixed via module providers)
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  // ----------------------------------------------------
  // BASIC HELPERS
  // ----------------------------------------------------
  private toCents(value: any, fieldName: string): number {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const n = Number(value);

    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      throw new BadRequestException(`Invalid ${fieldName}: ${value}`);
    }

    return n;
  }

  // ----------------------------------------------------
  // PUBLIC QUERIES
  // ----------------------------------------------------

  async getItemsForVenue(venueId: number): Promise<StoreItem[]> {
    if (!venueId || venueId <= 0) {
      throw new BadRequestException('venueId must be positive.');
    }

    return this.storeItemRepo.find({
      where: { venueId },
      order: { createdAt: 'ASC' },
    });
  }

  async getAllItems(): Promise<StoreItem[]> {
    return this.storeItemRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getItemById(id: number): Promise<StoreItem> {
    if (!id || id <= 0) {
      throw new BadRequestException('id must be positive.');
    }

    const item = await this.storeItemRepo.findOne({ where: { id } });

    if (!item) {
      throw new BadRequestException(`Store item ${id} not found.`);
    }

    return item;
  }

  // ----------------------------------------------------
  // DEV SEED / OWNER UTILITIES
  // ----------------------------------------------------

  async createItemForVenue(
    venueId: number,
    name: string,
    priceCents: number,
  ): Promise<StoreItem> {
    if (!venueId || venueId <= 0) {
      throw new BadRequestException('venueId must be positive.');
    }

    if (!name || !name.trim()) {
      throw new BadRequestException('name is required.');
    }

    const normalizedPrice = this.toCents(priceCents, 'priceCents');

    const item = this.storeItemRepo.create({
      venueId,
      name: name.trim(),
      priceCents: normalizedPrice,
    });

    return this.storeItemRepo.save(item);
  }

  async findItemsByOwner(ownerId: number): Promise<
    Array<{
      id: number;
      name: string;
      amountCents: number;
      venueId: number;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('ownerId must be positive.');
    }

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('si.id', 'id')
      .addSelect('si.name', 'name')
      .addSelect('si.priceCents', 'amountCents')
      .addSelect('si.venueId', 'venueId')
      .addSelect('si.createdAt', 'createdAt')
      .addSelect('si.updatedAt', 'updatedAt')
      .from('store_items', 'si')
      .innerJoin('venues', 'v', 'v.id = si.venueId')
      .where('v.ownerId = :ownerId', { ownerId })
      .orderBy('si.createdAt', 'DESC')
      .getRawMany<{
        id: number;
        name: string;
        amountCents: number;
        venueId: number;
        createdAt: string;
        updatedAt: string;
      }>();

    return rows;
  }

  // ----------------------------------------------------
  // LEGACY OWNER ORDERS (kept)
  // ----------------------------------------------------
  async findOrdersByOwner(ownerId: number): Promise<
    Array<{
      orderId: number;
      createdAt: string;
      status: string;
      itemName: string;
      quantity: number;
      amountCents: number;
      feeCents: number;
      payoutCents: number;
      buyerId: number;
      venueId: number;
      venueName: string;
    }>
  > {
    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('ownerId must be positive.');
    }

    const platformFeePercent = 10;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.buyerId', 'buyerId')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('v.ownerId = :ownerId', { ownerId })
      .andWhere('o.status = :status', { status: 'completed' })
      .orderBy('o.createdAt', 'DESC')
      .getRawMany<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        buyerId: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    return rows.map((row) => {
      const amount = Number(row.amountCents);
      const feeCents = Math.floor((amount * platformFeePercent) / 100);
      const payoutCents = amount - feeCents;

      return {
        orderId: row.orderId,
        createdAt: row.createdAt,
        status: row.status,
        itemName: row.itemName,
        quantity: Number(row.quantity),
        amountCents: amount,
        feeCents,
        payoutCents,
        buyerId: Number(row.buyerId),
        venueId: Number(row.venueId),
        venueName: row.venueName,
      };
    });
  }

  // ==============================================================
  // MILESTONE 8 — OWNER ORDERS (LIVE)
  // ==============================================================
  async findOrdersByOwnerLive(ownerId: number): Promise<
    Array<{
      orderId: number;
      createdAt: string;
      status: string;
      itemName: string;
      quantity: number;
      amountCents: number;
      feeCents: number;
      payoutCents: number;
      buyerId: number;
      venueId: number;
      venueName: string;
    }>
  > {
    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('ownerId must be positive.');
    }

    const platformFeePercent = 10;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.buyerId', 'buyerId')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('v.ownerId = :ownerId', { ownerId })
      .orderBy('o.createdAt', 'DESC')
      .getRawMany<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        buyerId: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    return rows.map((row) => {
      const amount = Number(row.amountCents);
      const feeCents = Math.floor((amount * platformFeePercent) / 100);
      const payoutCents = amount - feeCents;

      return {
        orderId: Number(row.orderId),
        createdAt: row.createdAt,
        status: row.status,
        itemName: row.itemName,
        quantity: Number(row.quantity),
        amountCents: amount,
        feeCents,
        payoutCents,
        buyerId: Number(row.buyerId),
        venueId: Number(row.venueId),
        venueName: row.venueName,
      };
    });
  }

  // ==============================================================
  // MILESTONE 9A — OWNER ORDER DETAIL (LIVE)
  // ==============================================================
  async findOwnerOrderByIdLive(
    ownerId: number,
    orderId: number,
  ): Promise<{
    orderId: number;
    createdAt: string;
    status: string;
    itemName: string;
    quantity: number;
    amountCents: number;
    feeCents: number;
    payoutCents: number;
    buyerId: number;
    venueId: number;
    venueName: string;
  }> {
    if (!ownerId || ownerId <= 0) throw new BadRequestException('ownerId must be positive.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const platformFeePercent = 10;

    const row = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.buyerId', 'buyerId')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('v.ownerId = :ownerId', { ownerId })
      .andWhere('o.id = :orderId', { orderId })
      .getRawOne<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        buyerId: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    if (!row) throw new BadRequestException('Order not found for this owner');

    const amount = Number(row.amountCents);
    const feeCents = Math.floor((amount * platformFeePercent) / 100);
    const payoutCents = amount - feeCents;

    return {
      orderId: Number(row.orderId),
      createdAt: row.createdAt,
      status: row.status,
      itemName: row.itemName,
      quantity: Number(row.quantity),
      amountCents: amount,
      feeCents,
      payoutCents,
      buyerId: Number(row.buyerId),
      venueId: Number(row.venueId),
      venueName: row.venueName,
    };
  }

  // ----------------------------------------------------
  // BUYER LIST (shows pending/completed/canceled)
  // ----------------------------------------------------
  async findOrdersForBuyer(buyerId: number): Promise<
    Array<{
      orderId: number;
      createdAt: string;
      status: string;
      itemName: string;
      quantity: number;
      amountCents: number;
      feeCents: number;
      payoutCents: number;
      venueId: number;
      venueName: string;
    }>
  > {
    if (!buyerId || buyerId <= 0) throw new BadRequestException('buyerId must be positive.');

    const platformFeePercent = 10;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('o.buyerId = :buyerId', { buyerId })
      .orderBy('o.createdAt', 'DESC')
      .getRawMany<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    return rows.map((row) => {
      const amount = Number(row.amountCents);
      const feeCents = Math.floor((amount * platformFeePercent) / 100);
      const payoutCents = amount - feeCents;

      return {
        orderId: Number(row.orderId),
        createdAt: row.createdAt,
        status: row.status,
        itemName: row.itemName,
        quantity: Number(row.quantity),
        amountCents: amount,
        feeCents,
        payoutCents,
        venueId: Number(row.venueId),
        venueName: row.venueName,
      };
    });
  }

  // ==============================================================
  // BUYER: ORDER DETAIL + CANCEL
  // ==============================================================
  async findOrderForBuyerById(
    buyerId: number,
    orderId: number,
  ): Promise<{
    orderId: number;
    createdAt: string;
    status: string;
    itemName: string;
    quantity: number;
    amountCents: number;
    feeCents: number;
    payoutCents: number;
    venueId: number;
    venueName: string;
  }> {
    if (!buyerId || buyerId <= 0) throw new BadRequestException('buyerId must be positive.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const platformFeePercent = 10;

    const row = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('o.id = :orderId', { orderId })
      .andWhere('o.buyerId = :buyerId', { buyerId })
      .getRawOne<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    if (!row) throw new BadRequestException('Order not found for this buyer.');

    const amount = Number(row.amountCents);
    const feeCents = Math.floor((amount * platformFeePercent) / 100);
    const payoutCents = amount - feeCents;

    return {
      orderId: Number(row.orderId),
      createdAt: row.createdAt,
      status: row.status,
      itemName: row.itemName,
      quantity: Number(row.quantity),
      amountCents: amount,
      feeCents,
      payoutCents,
      venueId: Number(row.venueId),
      venueName: row.venueName,
    };
  }

  async cancelOrderForBuyer(buyerId: number, orderId: number): Promise<StoreItemOrder> {
    if (!buyerId || buyerId <= 0) throw new BadRequestException('buyerId must be positive.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const order = await this.storeItemOrderRepo.findOne({ where: { id: orderId, buyerId } });
    if (!order) throw new BadRequestException('Order not found for this buyer.');

    if (String(order.status).toLowerCase() !== 'pending') {
      throw new BadRequestException('Only pending orders can be canceled.');
    }

    order.status = 'canceled' as any;
    const saved = await this.storeItemOrderRepo.save(order);

    (this.websocketGateway as any)?.emitOrderUpdated?.(saved);

    return saved;
  }

  // ----------------------------------------------------
  // OWNER STATS
  // ----------------------------------------------------
  async getOwnerStats(ownerId: number): Promise<{
    total: { ordersCount: number; amountCents: number; feeCents: number; payoutCents: number };
    byVenue: Array<{
      venueId: number;
      venueName: string;
      ordersCount: number;
      amountCents: number;
      feeCents: number;
      payoutCents: number;
    }>;
  }> {
    if (!ownerId || ownerId <= 0) throw new BadRequestException('ownerId must be positive.');

    const platformFeePercent = 10;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('v.id', 'venueId')
      .addSelect('v.name', 'venueName')
      .addSelect('COUNT(o.id)', 'ordersCount')
      .addSelect('COALESCE(SUM(o.amountCents), 0)', 'amountCents')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .where('v.ownerId = :ownerId', { ownerId })
      .andWhere('o.status = :status', { status: 'completed' })
      .groupBy('v.id')
      .addGroupBy('v.name')
      .orderBy('v.name', 'ASC')
      .getRawMany<{
        venueId: number;
        venueName: string;
        ordersCount: string | number;
        amountCents: string | number;
      }>();

    const byVenue = rows.map((row) => {
      const amount = Number(row.amountCents) || 0;
      const ordersCount = Number(row.ordersCount) || 0;
      const feeCents = Math.floor((amount * platformFeePercent) / 100);
      const payoutCents = amount - feeCents;

      return {
        venueId: Number(row.venueId),
        venueName: row.venueName,
        ordersCount,
        amountCents: amount,
        feeCents,
        payoutCents,
      };
    });

    const total = byVenue.reduce(
      (acc, v) => {
        acc.ordersCount += v.ordersCount;
        acc.amountCents += v.amountCents;
        acc.feeCents += v.feeCents;
        acc.payoutCents += v.payoutCents;
        return acc;
      },
      { ordersCount: 0, amountCents: 0, feeCents: 0, payoutCents: 0 },
    );

    return { total, byVenue };
  }

  // ----------------------------------------------------
  // ORDER CREATION + WALLET INTEGRATION
  // ----------------------------------------------------
  async createOrderForUser(
    buyerId: number,
    dto: { itemId: any; quantity?: any; qty?: any; count?: any; amount?: any },
  ): Promise<StoreItemOrder> {
    if (!buyerId || buyerId <= 0) throw new BadRequestException('buyerId must be positive.');

    const itemId = this.toCents(dto?.itemId, 'itemId');

    const rawQuantity =
      (dto as any)?.quantity ?? (dto as any)?.qty ?? (dto as any)?.count ?? (dto as any)?.amount;

    this.logger.log(`[createOrderForUser] rawQuantity from DTO = ${JSON.stringify(rawQuantity)}`);

    if (rawQuantity === null || rawQuantity === undefined || rawQuantity === '' || isNaN(Number(rawQuantity))) {
      throw new BadRequestException('Quantity must be positive.');
    }

    const quantity = Number(rawQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be positive.');
    }

    const item = await this.storeItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new BadRequestException(`Store item ${itemId} not found.`);

    const priceCents = this.toCents(item.priceCents, 'priceCents');
    const amountCents = priceCents * quantity;
    const platformFeePercent = 10;

    let venueOwnerId: number | null = null;
    if (item.venueId) {
      const raw = await this.dataSource
        .createQueryBuilder()
        .select('v.ownerId', 'ownerId')
        .from('venues', 'v')
        .where('v.id = :venueId', { venueId: item.venueId })
        .getRawOne<{ ownerId: number | null }>();

      if (raw && raw.ownerId) venueOwnerId = raw.ownerId;
    }

    this.logger.log(
      `[createOrderForUser] buyerId=${buyerId}, itemId=${itemId}, quantity=${quantity}, amountCents=${amountCents}, venueOwnerId=${venueOwnerId}`,
    );

    await this.walletService.chargeStoreItemPurchase(
      buyerId,
      venueOwnerId,
      amountCents,
      platformFeePercent,
      {
        itemId: item.id,
        venueId: item.venueId,
        buyerId,
        itemName: item.name,
        quantity,
        amountCents,
      },
    );

    const order = this.storeItemOrderRepo.create({
      buyerId,
      itemId,
      quantity,
      amountCents,
      status: 'pending',
      venueId: item.venueId ?? null,
      itemSnapshot: {
        id: item.id,
        name: item.name,
        priceCents: priceCents,
        venueId: item.venueId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });

    const saved = await this.storeItemOrderRepo.save(order);

    this.logger.log(
      `[createOrderForUser] order created id=${saved.id}, amountCents=${saved.amountCents}, status=${saved.status}`,
    );

    this.websocketGateway.emitOrderCreated({ ...saved, venueOwnerId });

    return saved;
  }

  // ==============================================================
  // OWNER ACTIONS
  // ==============================================================
  async ownerMarkOrder(ownerId: number, orderId: number, status: string): Promise<StoreItemOrder> {
    if (!ownerId || ownerId <= 0) throw new BadRequestException('ownerId must be positive.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const allowed = new Set(['pending', 'completed', 'canceled']);
    const next = String(status || '').toLowerCase();
    if (!allowed.has(next)) throw new BadRequestException('Invalid status.');

    const raw = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'id')
      .addSelect('o.status', 'status')
      .addSelect('v.ownerId', 'ownerId')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .where('o.id = :orderId', { orderId })
      .andWhere('v.ownerId = :ownerId', { ownerId })
      .getRawOne<{ id: number; status: string; ownerId: number }>();

    if (!raw) throw new BadRequestException('Order not found for this owner');

    const order = await this.storeItemOrderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    order.status = next as any;
    const saved = await this.storeItemOrderRepo.save(order);

    (this.websocketGateway as any)?.emitOrderUpdated?.(saved);

    return saved;
  }

  async ownerCancelOrder(ownerId: number, orderId: number): Promise<StoreItemOrder> {
    if (!ownerId || ownerId <= 0) throw new BadRequestException('ownerId must be positive.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const raw = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'id')
      .addSelect('o.status', 'status')
      .addSelect('v.ownerId', 'ownerId')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .where('o.id = :orderId', { orderId })
      .andWhere('v.ownerId = :ownerId', { ownerId })
      .getRawOne<{ id: number; status: string; ownerId: number }>();

    if (!raw) throw new BadRequestException('Order not found for this owner');

    const order = await this.storeItemOrderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    if (String(order.status).toLowerCase() === 'completed') {
      throw new BadRequestException('Cannot cancel a completed order.');
    }

    order.status = 'canceled' as any;
    const saved = await this.storeItemOrderRepo.save(order);

    (this.websocketGateway as any)?.emitOrderUpdated?.(saved);

    return saved;
  }

  // ==============================================================
  // STAFF FLOW (venue-scoped) — THESE TWO MUST EXIST (your controller uses them)
  // ==============================================================
  async findOrdersForStaff(venueId: number): Promise<
    Array<{
      orderId: number;
      createdAt: string;
      status: string;
      itemName: string;
      quantity: number;
      amountCents: number;
      feeCents: number;
      payoutCents: number;
      buyerId: number;
      venueId: number;
      venueName: string;
    }>
  > {
    if (!venueId || venueId <= 0) throw new BadRequestException('venueId must be positive.');

    const platformFeePercent = 10;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.buyerId', 'buyerId')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('o.venueId = :venueId', { venueId })
      .orderBy('o.createdAt', 'DESC')
      .getRawMany<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        buyerId: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    return rows.map((row) => {
      const amount = Number(row.amountCents);
      const feeCents = Math.floor((amount * platformFeePercent) / 100);
      const payoutCents = amount - feeCents;

      return {
        orderId: Number(row.orderId),
        createdAt: row.createdAt,
        status: row.status,
        itemName: row.itemName,
        quantity: Number(row.quantity),
        amountCents: amount,
        feeCents,
        payoutCents,
        buyerId: Number(row.buyerId),
        venueId: Number(row.venueId),
        venueName: row.venueName,
      };
    });
  }

  async findStaffOrderById(
    venueId: number,
    orderId: number,
  ): Promise<{
    orderId: number;
    createdAt: string;
    status: string;
    itemName: string;
    quantity: number;
    amountCents: number;
    feeCents: number;
    payoutCents: number;
    buyerId: number;
    venueId: number;
    venueName: string;
  }> {
    if (!venueId || venueId <= 0) throw new BadRequestException('venueId must be positive.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const platformFeePercent = 10;

    const row = await this.dataSource
      .createQueryBuilder()
      .select('o.id', 'orderId')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.status', 'status')
      .addSelect('o.quantity', 'quantity')
      .addSelect('o.amountCents', 'amountCents')
      .addSelect('o.buyerId', 'buyerId')
      .addSelect('o.venueId', 'venueId')
      .addSelect('si.name', 'itemName')
      .addSelect('v.name', 'venueName')
      .from('store_item_orders', 'o')
      .innerJoin('venues', 'v', 'v.id = o.venueId')
      .innerJoin('store_items', 'si', 'si.id = o.itemId')
      .where('o.venueId = :venueId', { venueId })
      .andWhere('o.id = :orderId', { orderId })
      .getRawOne<{
        orderId: number;
        createdAt: string;
        status: string;
        quantity: number;
        amountCents: number;
        buyerId: number;
        venueId: number;
        itemName: string;
        venueName: string;
      }>();

    if (!row) throw new BadRequestException('Order not found for this venue');

    const amount = Number(row.amountCents);
    const feeCents = Math.floor((amount * platformFeePercent) / 100);
    const payoutCents = amount - feeCents;

    return {
      orderId: Number(row.orderId),
      createdAt: row.createdAt,
      status: row.status,
      itemName: row.itemName,
      quantity: Number(row.quantity),
      amountCents: amount,
      feeCents,
      payoutCents,
      buyerId: Number(row.buyerId),
      venueId: Number(row.venueId),
      venueName: row.venueName,
    };
  }

  // ==============================================================
  // STAFF ACTIONS — these power your POST /mark and /cancel
  // ==============================================================
  async staffMarkOrder(staffVenueId: number, orderId: number, status: string): Promise<StoreItemOrder> {
    if (!staffVenueId || staffVenueId <= 0) throw new BadRequestException('staff venueId is required.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const allowed = new Set(['pending', 'completed', 'canceled']);
    const next = String(status || '').toLowerCase();
    if (!allowed.has(next)) throw new BadRequestException('Invalid status.');

    const order = await this.storeItemOrderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    if (Number(order.venueId) !== Number(staffVenueId)) {
      throw new BadRequestException('Order not found for this venue');
    }

    // If already completed, allow idempotent "completed" but block changes away from it
    if (String(order.status).toLowerCase() === 'completed' && next !== 'completed') {
      throw new BadRequestException('Cannot change a completed order.');
    }

    order.status = next as any;
    const saved = await this.storeItemOrderRepo.save(order);

    (this.websocketGateway as any)?.emitOrderUpdated?.(saved);

    return saved;
  }

  async staffCancelOrder(staffVenueId: number, orderId: number): Promise<StoreItemOrder> {
    if (!staffVenueId || staffVenueId <= 0) throw new BadRequestException('staff venueId is required.');
    if (!orderId || orderId <= 0) throw new BadRequestException('orderId must be positive.');

    const order = await this.storeItemOrderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    if (Number(order.venueId) !== Number(staffVenueId)) {
      throw new BadRequestException('Order not found for this venue');
    }

    if (String(order.status).toLowerCase() === 'completed') {
      throw new BadRequestException('Cannot cancel a completed order.');
    }

    order.status = 'canceled' as any;
    const saved = await this.storeItemOrderRepo.save(order);

    (this.websocketGateway as any)?.emitOrderUpdated?.(saved);

    return saved;
  }
}
