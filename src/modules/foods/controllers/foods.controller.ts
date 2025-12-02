import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FoodsService } from '../foods.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

class CreateFoodOrderDto {
  venueId: number;
  foodName: string;
  amountCents: number;
  currency?: string;
  message?: string;
  recipientId?: number;
}

class RedeemFoodDto {
  redemptionCode: string;
}

/**
 * Extract user id from JWT payload on the request.
 */
function getUserIdFromRequest(req: any): number {
  const user = req?.user || {};
  const rawId = user.sub ?? user.id ?? user.userId;

  if (rawId === undefined || rawId === null) {
    throw new UnauthorizedException('Invalid auth payload: no user id');
  }

  const parsed = Number(rawId);
  if (Number.isNaN(parsed)) {
    throw new UnauthorizedException(
      'Invalid auth payload: user id is not a number',
    );
  }

  return parsed;
}

@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  // POST /foods/orders — create a food order
  @UseGuards(JwtAuthGuard)
  @Post('orders')
  async createOrder(@Req() req: any, @Body() dto: CreateFoodOrderDto) {
    const senderId = getUserIdFromRequest(req);

    return this.foodsService.createOrder({
      senderId,
      venueId: dto.venueId,
      foodName: dto.foodName,
      amountCents: dto.amountCents,
      currency: dto.currency,
      message: dto.message,
      recipientId: dto.recipientId,
    });
  }

  // GET /foods/my — list food orders I sent
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async findMyOrders(@Req() req: any) {
    const userId = getUserIdFromRequest(req);
    return this.foodsService.findMyOrders(userId);
  }

  // POST /foods/redeem — staff redeems a food order by code
  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  async redeem(@Body() dto: RedeemFoodDto) {
    return this.foodsService.redeemByCode(dto.redemptionCode);
  }
}
