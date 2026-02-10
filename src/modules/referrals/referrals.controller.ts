import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('health')
  health() {
    return { ok: true, pillar: 4, module: 'referrals' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/code')
  async myCode(@Req() req: any) {
    const userId =
      Number(req?.user?.sub ?? req?.user?.id ?? req?.user?.userId ?? 0) || null;

    if (!userId) {
      return { ok: false, error: 'UNAUTHORIZED' };
    }

    const code = await this.referrals.getOrCreateCode(userId);
    return {
      ok: true,
      code,
      deepLink: `tabz://invite?code=${encodeURIComponent(code)}`,
    };
  }
}