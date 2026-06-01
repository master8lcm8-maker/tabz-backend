import { BadRequestException, Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { StoreItemsService } from '../modules/store-items/store-items.service';

@Controller('owner')
export class OwnerConvenienceController {
  constructor(private readonly storeItemsService: StoreItemsService) {}

  private getOwnerContext(req: any) {
    const user = req?.user || {};

    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can access owner convenience routes.');
    }

    const ownerId = Number(user.userId || user.id || user.sub || 0);

    if (!ownerId) {
      throw new BadRequestException('Invalid ownerId on owner token.');
    }

    return { ownerId };
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async orders(@Req() req: any) {
    const { ownerId } = this.getOwnerContext(req);
    const value = await this.storeItemsService.findOrdersByOwnerLive(ownerId);

    return {
      ok: true,
      source: 'store-items/owner/orders',
      facade: 'owner/orders',
      ownerId,
      total: value.length,
      value,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('queue')
  async queue(@Req() req: any) {
    const { ownerId } = this.getOwnerContext(req);
    const value = await this.storeItemsService.findOrdersByOwnerLive(ownerId);

    return {
      ok: true,
      source: 'store-items/owner/orders',
      facade: 'owner/queue',
      ownerId,
      total: value.length,
      value,
    };
  }
}
