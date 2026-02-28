import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountDeletionService } from './account-deletion.service';
import { AccountDeletionRequestDto, AccountDeletionConfirmDto } from './account-deletion.dto';

@Controller('account-deletion')
export class AccountDeletionController {
  constructor(private readonly svc: AccountDeletionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('request')
  async request(@Req() req: any, @Body() body: AccountDeletionRequestDto) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    return this.svc.requestDeletion(userId, body?.reason, req.ip, req.headers?.['user-agent']);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('confirm')
  async confirm(@Req() req: any, @Body() body: AccountDeletionConfirmDto) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    return this.svc.confirmDeletion(userId, String(body?.token ?? ''), body?.reason);
  }
}

