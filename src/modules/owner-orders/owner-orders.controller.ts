// src/modules/owner-orders/owner-orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerAuthGuard } from '../auth/guards/owner-auth.guard';
import { OwnerOrdersService, OwnerOrderDto } from './owner-orders.service';

interface AuthUser {
  sub?: number;
  email?: string;
  id?: number;
  userId?: number;
  ownerId?: number;
  ownerUserId?: number;
  role?: string;
  [key: string]: any;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

function resolveOwnerUserId(user?: AuthUser): number | undefined {
  if (!user) return undefined;

  return (
    user.ownerUserId ??
    user.ownerId ??
    user.userId ??
    user.id ??
    user.sub
  );
}

@UseGuards(JwtAuthGuard, OwnerAuthGuard)
@Controller('owner/orders')
export class OwnerOrdersController {
  constructor(private readonly ownerOrdersService: OwnerOrdersService) {}

  @Get()
  async getOwnerOrders(@Req() req: AuthRequest): Promise<OwnerOrderDto[]> {
    // 🔍 DEBUG LOG – see exactly what the mobile/web call is sending
    console.log(
      '[OwnerOrdersController] /owner/orders',
      'authHeader=',
      req.headers?.authorization,
      'user=',
      req.user,
    );

    const ownerUserId = resolveOwnerUserId(req.user);
    if (!ownerUserId) {
      throw new ForbiddenException('Missing owner user id');
    }

    return this.ownerOrdersService.getOwnerOrders(ownerUserId);
  }

  @Post(':id/cancel')
  async cancelOwnerOrder(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OwnerOrderDto> {
    const ownerUserId = resolveOwnerUserId(req.user);
    if (!ownerUserId) {
      throw new ForbiddenException('Missing owner user id');
    }
    return this.ownerOrdersService.cancelOwnerOrder(ownerUserId, id);
  }
}
