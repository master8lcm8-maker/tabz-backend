import { Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';

@Controller('engagement')
export class EngagementController {
  constructor(private svc: EngagementService) {}

  @UseGuards(JwtAuthGuard)
  @Post('test-action')
  async test(@Req() req: any) {
    return this.svc.record(req.user.userId, 'TEST_ACTION');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async mine(@Req() req: any) {
    return this.svc.mine(req.user.userId);
  }
}

