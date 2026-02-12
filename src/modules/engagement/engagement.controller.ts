import { Controller, Post, Get, Req, UseGuards, Body, BadRequestException } from '@nestjs/common';
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

  // ✅ Real event write
  @UseGuards(JwtAuthGuard)
  @Post('events')
  async createEvent(
    @Req() req: any,
    @Body() body: { eventType?: string; targetId?: string; metadata?: any },
  ) {
    if (!body?.eventType) throw new BadRequestException('eventType is required');
    return this.svc.record(req.user.userId, body.eventType, body.targetId, body.metadata);
  }

  // ✅ Real event read (for current user)
  @UseGuards(JwtAuthGuard)
  @Get('events')
  async myEvents(@Req() req: any) {
    return this.svc.mine(req.user.userId);
  }
}
