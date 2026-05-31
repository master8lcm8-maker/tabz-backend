import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedemptionsService } from './redemptions.service';

function getUserIdFromRequest(req: any): number {
  return Number(
    req?.user?.userId ??
    req?.user?.id ??
    req?.user?.sub ??
    0,
  );
}

function getRoleFromRequest(req: any): string {
  return String(req?.user?.role || '').toLowerCase();
}

@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  async redeem(@Req() req: any, @Body() body: { code?: string; kind?: string }) {
    return this.redemptionsService.redeem({
      code: String(body?.code || '').trim(),
      kind: String(body?.kind || '').trim(),
      userId: getUserIdFromRequest(req),
      role: getRoleFromRequest(req),
    });
  }
}
