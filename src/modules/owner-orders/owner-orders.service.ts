// src/modules/owner-orders/owner-orders.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class OwnerOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly websocketGateway: WebsocketGateway, // 👈 REAL-TIME SOCKET
  ) {}

  private venuesRepo() {
    return this.dataSource.getRepository<any>('venues');
  }
  private usersRepo() {
    return this.dataSource.getRepository<any>('users');
  }
  private walletsRepo() {
    return this.dataSource.getRepository<any>('wallets');
  }
  private ordersRepo() {
    return this.dataSource.getRepository<any>('store_item_orders');
  }

  async getOwnerOrders(ownerUserId: number) {
    if (!ownerUserId) throw new ForbiddenException('Missing owner user id');

    const venues = await this.venuesRepo().find({
      where: { ownerId: ownerUserId },
    });

    if (!venues.length) return [];

    const venueIds = venues.map((v) => v.id);

    const orders = await this.ordersRepo().find({
      where: { venueId: In(venueIds) },
      order: { createdAt: 'DESC' },
    });

    if (!orders.length) return [];

    const buyerIds = Array.from(new Set(orders.map((o) => o.buyerId)));

    const buyers = buyerIds.length
      ? await this.usersRepo().find({ where: { id: In(buyerIds) } })
      : [];

    const buyerMap = new Map();
    buyers.forEach((b) => buyerMap.set(b.id, b));

    return orders.map((order) => {
      const buyer = buyerMap.get(order.buyerId);

      const buyerName = buyer
        ? [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') ||
          buyer.email ||
          `User #${buyer.id}`
        : null;

      return {
        id: order.id,
        buyerId: order.buyerId,
        buyerName,
        itemName: order.itemSnapshot?.name ?? 'Unknown',
        quantity: order.quantity,
        amountCents: String(order.amountCents),
        status: order.status ?? 'pending',
        venueId: order.venueId,
        createdAt: order.createdAt,
      };
    });
  }

  // -------------------------------
  // CANCEL ORDER
  // -------------------------------
  async cancelOwnerOrder(ownerUserId: number, orderId: number) {
    if (!ownerUserId) throw new ForbiddenException('Missing owner user id');

    const venuesRepo = this.venuesRepo();
    const ordersRepo = this.ordersRepo();

    const order = await ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const venue = await venuesRepo.findOne({ where: { id: order.venueId } });

    if (!venue || venue.ownerId !== ownerUserId) {
      throw new ForbiddenException('You cannot modify this order');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Only pending orders can be cancelled (current: ${order.status})`,
      );
    }

    const updatedOrder = await this.dataSource.transaction(async (manager) => {
      const txOrders = manager.getRepository('store_item_orders');
      const txWallets = manager.getRepository('wallets');

      const txOrder = await txOrders.findOne({ where: { id: orderId } });
      if (!txOrder) throw new NotFoundException('Order not found inside tx');

      if (txOrder.status !== 'pending') {
        throw new BadRequestException(
          `Only pending orders can be cancelled (current: ${txOrder.status})`,
        );
      }

      const refundAmount = BigInt(String(txOrder.amountCents ?? '0'));

      let wallet = await txWallets.findOne({
        where: { userId: txOrder.buyerId },
      });

      if (!wallet) {
        wallet = txWallets.create({
          userId: txOrder.buyerId,
          spendableBalanceCents: '0',
          cashoutAvailableCents: '0',
        });
      }

      const currentSpendable = BigInt(wallet.spendableBalanceCents ?? '0');
      wallet.spendableBalanceCents = (currentSpendable + refundAmount).toString();

      await txWallets.save(wallet);

      txOrder.status = 'cancelled';
      return await txOrders.save(txOrder);
    });

    const buyer = await this.usersRepo().findOne({
      where: { id: updatedOrder.buyerId },
    });

    const itemName =
      updatedOrder.itemSnapshot?.name ??
      updatedOrder.itemName ??
      'Unknown item';

    const dto = {
      id: updatedOrder.id,
      buyerId: updatedOrder.buyerId,
      buyerName: buyer
        ? [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') ||
          buyer.email
        : null,
      itemName,
      quantity: updatedOrder.quantity ?? 1,
      amountCents: String(updatedOrder.amountCents),
      status: updatedOrder.status,
      venueId: updatedOrder.venueId,
      createdAt: updatedOrder.createdAt,
    };

    // --------------------------------------------
    // 🔥 REAL-TIME EMIT — ORDER UPDATED
    // --------------------------------------------
    this.websocketGateway.emitOrderUpdated({
      ...dto,
      venueOwnerId: ownerUserId,
    });

    return dto;
  }
}
