import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

function resolveUserId(req: any): number {
  const user = req?.user || {};
  const raw = user.sub ?? user.id ?? user.userId;
  const userId = Number(raw);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new BadRequestException('authenticated_user_required');
  }

  return userId;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listMine(@Req() req: any, @Query('limit') limit?: string) {
    return this.notificationsService.listForUser(resolveUserId(req), limit);
  }

  @Get('unread')
  unreadMine(@Req() req: any, @Query('limit') limit?: string) {
    return this.notificationsService.unreadForUser(resolveUserId(req), limit);
  }

  @Get('count')
  countMine(@Req() req: any) {
    return this.notificationsService.countForUser(resolveUserId(req));
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(resolveUserId(req), id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(resolveUserId(req));
  }
}
