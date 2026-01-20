import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { DrinksService } from '../drinks.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

function getUserIdFromRequest(req: Request): number {
  const user: any = (req as any).user || {};
  const rawId = user.sub ?? user.id ?? user.userId;
  const idNum = Number(rawId);
  if (!idNum || Number.isNaN(idNum)) {
    throw new Error('Invalid user id in JWT');
  }
  return idNum;
}

@Controller('drinks')
export class DrinksController {
  constructor(private readonly drinksService: DrinksService) {}

  // USER: send a drink
  @UseGuards(JwtAuthGuard)
  @Post('orders')
  async createOrder(@Req() req: Request, @Body() body: any) {
    const userId = getUserIdFromRequest(req);

    const {
      venueId,
      drinkName,
      priceCents,
      note,
      platformFeePercent,
    } = body;

    return this.drinksService.createOrder({
      senderId: userId,
      venueId,
      drinkName,
      priceCents,
      note,
      platformFeePercent,
    });
  }

  // USER: drinks I sent
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyOrders(@Req() req: Request) {
    const userId = getUserIdFromRequest(req);
    return this.drinksService.getOrdersForUser(userId);
  }

  // VENUE OWNER: all drinks sent to my venues
  @UseGuards(JwtAuthGuard)
  @Get('venue-orders')
  async getVenueOrders(@Req() req: Request) {
    const ownerId = getUserIdFromRequest(req);
    return this.drinksService.getOrdersForVenueOwner(ownerId);
  }

  // STAFF: redeem a drink by code (QR)
  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  async redeem(@Body('code') code: string) {
    return this.drinksService.redeemOrderByCode(code);
  }
}


