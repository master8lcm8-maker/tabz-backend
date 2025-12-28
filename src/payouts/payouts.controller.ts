import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayoutsService } from './payouts.service';

@Controller('owner/payouts')
@UseGuards(AuthGuard('jwt'))
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  async listForOwner(@Req() req: any) {
    const userId = req.user?.sub;
    if (!userId) return [];
    return this.payoutsService.getPayoutsForUser(userId);
  }
}
