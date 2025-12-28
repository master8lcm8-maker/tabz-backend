// src/modules/store-items/store-items.owner.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

import { StoreItemsService } from './store-items.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from '../../wallet/wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('store-items')
export class StoreItemsOwnerController {
  constructor(
    private readonly storeItemsService: StoreItemsService,
    private readonly walletService: WalletService,
  ) {}

  // --------------------------------------------------------------
  // BUYER — CREATE ORDER
  // --------------------------------------------------------------
  @Post('order')
  async createOrder(@Req() req: Request, @Body() body: any) {
    const buyerId = (req as any).user?.sub;

    if (!buyerId || buyerId <= 0) {
      throw new BadRequestException('Invalid buyer id from auth token.');
    }

    return this.storeItemsService.createOrderForUser(buyerId, body);
  }

  // --------------------------------------------------------------
  // BUYER — MY ORDERS
  // --------------------------------------------------------------
  @Get('my-orders')
  async getMyOrders(@Req() req: Request) {
    const buyerId = (req as any).user?.sub;

    if (!buyerId || buyerId <= 0) {
      throw new BadRequestException('Invalid buyer id from auth token.');
    }

    const value = await this.storeItemsService.findOrdersForBuyer(buyerId);
    return { value, Count: value.length };
  }

  // ==============================================================
  // MILESTONE 8 — OWNER ORDERS (LIVE)
  // ==============================================================
  @Get('owner/orders')
  async getOwnerOrdersLive(@Req() req: Request) {
    const ownerId = (req as any).user?.sub;

    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('Invalid ownerId from auth token.');
    }

    const value = await this.storeItemsService.findOrdersByOwnerLive(ownerId);
    return { value, Count: value.length };
  }

  // ==============================================================
  // MILESTONE 9A — OWNER ORDER DETAIL (LIVE) ✅ NEW
  // ==============================================================
  @Get('owner/orders/:orderId')
  async getOwnerOrderDetail(
    @Req() req: Request,
    @Param('orderId') orderIdParam: string,
  ) {
    const ownerId = (req as any).user?.sub;

    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('Invalid ownerId from auth token.');
    }

    const orderId = Number(orderIdParam);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new BadRequestException('orderId must be a positive integer.');
    }

    const value = await this.storeItemsService.findOwnerOrderByIdLive(
  ownerId,
  orderId,
);


    return { value };
  }

  @Post('owner/orders/:orderId/cancel')
  async ownerCancelOrder(
    @Req() req: Request,
    @Param('orderId') orderIdParam: string,
  ) {
    const ownerId = (req as any).user?.sub;

    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('Invalid ownerId from auth token.');
    }

    const orderId = Number(orderIdParam);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new BadRequestException('orderId must be a positive integer.');
    }

    return this.storeItemsService.ownerCancelOrder(ownerId, orderId);
  }

  @Post('owner/orders/:orderId/mark')
  async ownerMarkOrder(
    @Req() req: Request,
    @Param('orderId') orderIdParam: string,
    @Body() body: { status: string },
  ) {
    const ownerId = (req as any).user?.sub;

    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('Invalid ownerId from auth token.');
    }

    const orderId = Number(orderIdParam);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new BadRequestException('orderId must be a positive integer.');
    }

    return this.storeItemsService.ownerMarkOrder(ownerId, orderId, body?.status);
  }

  // --------------------------------------------------------------
  // VENUE MENU — ITEMS FOR A VENUE
  // --------------------------------------------------------------
  @Get('venue/:venueId/items')
  async getItemsForVenue(@Param('venueId') venueIdParam: string) {
    const venueId = Number(venueIdParam);

    if (!Number.isInteger(venueId) || venueId <= 0) {
      throw new BadRequestException('venueId must be a positive integer.');
    }

    const items = await this.storeItemsService.getItemsForVenue(venueId);
    return { value: items, Count: items.length };
  }

  // --------------------------------------------------------------
  // 🔥 OWNER DASHBOARD ENDPOINT
  // --------------------------------------------------------------
  @Get('owner/dashboard')
  async getOwnerDashboard(@Req() req: Request) {
    const ownerId = (req as any).user?.sub;

    if (!ownerId || ownerId <= 0) {
      throw new BadRequestException('Invalid ownerId from auth token.');
    }

    const stats = await this.storeItemsService.getOwnerStats(ownerId);
    const recentOrders = await this.storeItemsService.findOrdersByOwner(ownerId);
    const wallet = await this.walletService.getSummary(ownerId);

    return {
      wallet,
      stats,
      recentOrders,
    };
  }
}
