import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthUser = {
  sub?: number;
  id?: number;
  userId?: number;
  role?: string;
};

type AuthRequest = Request & {
  user?: AuthUser;
};

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('scan')
  scan(@Query('code') code?: string, @Query('kind') kind?: string) {
    return this.qrService.scan({ code, kind });
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  redeem(@Req() req: AuthRequest, @Body() body: { code?: string; kind?: string }) {
    const user = req.user ?? {};
    const userId = Number(user.userId ?? user.id ?? user.sub ?? 0);

    return this.qrService.redeem({
      userId,
      role: user.role,
      code: body?.code,
      kind: body?.kind,
    });
  }
}

