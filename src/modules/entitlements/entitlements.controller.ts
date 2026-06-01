import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EntitlementsService } from './entitlements.service';

function getUserIdFromRequest(req: any): number {
  return Number(
    req?.user?.userId ??
    req?.user?.id ??
    req?.user?.sub ??
    0,
  );
}

@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  private async listForRequest(req: any) {
    const userId = getUserIdFromRequest(req);

    return {
      ok: true,
      items: await this.entitlementsService.listMine(userId),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async my(@Req() req: any) {
    return this.listForRequest(req);
  }

  // ENTITLEMENTS_READ_ALIAS_26P2R
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.listForRequest(req);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async root(@Req() req: any) {
    return this.listForRequest(req);
  }
}

