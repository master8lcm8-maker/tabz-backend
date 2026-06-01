import { BadRequestException, Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoreItemsService } from '../store-items/store-items.service';

@Controller('staff')
export class StaffConvenienceController {
  constructor(private readonly storeItemsService: StoreItemsService) {}

  private getStaffContext(req: any) {
    const user = req?.user || {};

    if (user.role !== 'staff') {
      throw new ForbiddenException('Only staff can access staff convenience routes.');
    }

    const venueId = Number(user.venueId || 0);

    if (!venueId) {
      throw new BadRequestException('Invalid venueId on staff token.');
    }

    return { venueId };
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async orders(@Req() req: any) {
    const { venueId } = this.getStaffContext(req);
    const value = await this.storeItemsService.findOrdersForStaff(venueId);

    return {
      ok: true,
      source: 'store-items/staff/orders',
      facade: 'staff/orders',
      venueId,
      total: value.length,
      value,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('queue')
  async queue(@Req() req: any) {
    const { venueId } = this.getStaffContext(req);
    const value = await this.storeItemsService.findOrdersForStaff(venueId);

    return {
      ok: true,
      source: 'store-items/staff/orders',
      facade: 'staff/queue',
      venueId,
      total: value.length,
      value,
    };
  }
}
