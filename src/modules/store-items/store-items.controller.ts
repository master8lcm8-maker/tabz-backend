// src/modules/store-items/store-items.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StoreItemsService } from './store-items.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('store-items')
export class StoreItemsController {
  constructor(private readonly storeItemsService: StoreItemsService) {}

  // -------------------------
  // PUBLIC ITEMS
  // -------------------------
  @Get()
  async getAllItems() {
    const value = await this.storeItemsService.getAllItems();
    return { value };
  }

  @Get('venue/:venueId')
  async getItemsForVenue(@Param('venueId') venueId: string) {
    const id = Number(venueId);
    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('venueId must be a positive integer.');
    }
    const value = await this.storeItemsService.getItemsForVenue(id);
    return { value };
  }

  // -------------------------
  // BUYER FLOW
  // -------------------------
  @UseGuards(JwtAuthGuard)
  @Post('order')
  async createOrder(@Req() req: any, @Body() body: any) {
    const user = req.user || {};
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can create orders.');
    }
    const value = await this.storeItemsService.createOrderForUser(Number(user.userId), body);
    return value;
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async myOrders(@Req() req: any) {
    const user = req.user || {};
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can view their orders.');
    }
    const value = await this.storeItemsService.findOrdersForBuyer(Number(user.userId));
    return { value };
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:orderId')
  async myOrderDetail(@Req() req: any, @Param('orderId') orderId: string) {
    const user = req.user || {};
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can view order detail.');
    }
    const value = await this.storeItemsService.findOrderForBuyerById(
      Number(user.userId),
      Number(orderId),
    );
    return { value };
  }

  @UseGuards(JwtAuthGuard)
  @Post('my-orders/:orderId/cancel')
  async cancelMyOrder(@Req() req: any, @Param('orderId') orderId: string) {
    const user = req.user || {};
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can cancel orders.');
    }
    const value = await this.storeItemsService.cancelOrderForBuyer(
      Number(user.userId),
      Number(orderId),
    );
    return value;
  }

  // -------------------------
  // OWNER FLOW (LIVE)
  // -------------------------
  @UseGuards(JwtAuthGuard)
  @Get('owner/orders')
  async ownerOrders(@Req() req: any) {
    const user = req.user || {};
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can view owner orders.');
    }
    const value = await this.storeItemsService.findOrdersByOwnerLive(Number(user.userId));
    return { value };
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner/orders/:orderId')
  async ownerOrderDetail(@Req() req: any, @Param('orderId') orderId: string) {
    const user = req.user || {};
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can view owner order detail.');
    }
    const value = await this.storeItemsService.findOwnerOrderByIdLive(
      Number(user.userId),
      Number(orderId),
    );
    return { value };
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner/stats')
  async ownerStats(@Req() req: any) {
    const user = req.user || {};
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can view stats.');
    }
    const value = await this.storeItemsService.getOwnerStats(Number(user.userId));
    return { value };
  }

  // -------------------------
  // STAFF FLOW (venue-scoped)
  // -------------------------
  @UseGuards(JwtAuthGuard)
  @Get('staff/orders')
  async staffOrders(@Req() req: any) {
    const user = req.user || {};
    if (user.role !== 'staff') {
      throw new ForbiddenException('Only staff can view staff orders.');
    }
    const venueId = Number(user.venueId);
    if (!venueId || venueId <= 0) {
      throw new BadRequestException('Invalid venueId on staff token.');
    }
    const value = await this.storeItemsService.findOrdersForStaff(venueId);
    return { value };
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff/orders/:orderId')
  async staffOrderDetail(@Req() req: any, @Param('orderId') orderId: string) {
    const user = req.user || {};
    if (user.role !== 'staff') {
      throw new ForbiddenException('Only staff can view staff order detail.');
    }
    const venueId = Number(user.venueId);
    if (!venueId || venueId <= 0) {
      throw new BadRequestException('Invalid venueId on staff token.');
    }
    const value = await this.storeItemsService.findStaffOrderById(venueId, Number(orderId));
    return { value };
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff/orders/:orderId/mark')
  async staffMark(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() body: { status?: string },
  ) {
    const user = req.user || {};
    if (user.role !== 'staff') {
      throw new ForbiddenException('Only staff can mark orders.');
    }
    const venueId = Number(user.venueId);
    if (!venueId || venueId <= 0) {
      throw new BadRequestException('Invalid venueId on staff token.');
    }

    const status = String(body?.status || '').toLowerCase().trim();
    const value = await this.storeItemsService.staffMarkOrder(venueId, Number(orderId), status);
    return value;
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff/orders/:orderId/cancel')
  async staffCancel(@Req() req: any, @Param('orderId') orderId: string) {
    const user = req.user || {};
    if (user.role !== 'staff') {
      throw new ForbiddenException('Only staff can cancel orders.');
    }
    const venueId = Number(user.venueId);
    if (!venueId || venueId <= 0) {
      throw new BadRequestException('Invalid venueId on staff token.');
    }

    const value = await this.storeItemsService.staffCancelOrder(venueId, Number(orderId));
    return value;
  }

  // -------------------------
  // PUBLIC: SINGLE ITEM (MUST BE LAST so it doesn't steal routes)
  // -------------------------
  @Get(':id(\\d+)')
  async getItemById(@Param('id') id: string) {
    const value = await this.storeItemsService.getItemById(Number(id));
    return { value };
  }
}
