// src/owner/owner-info.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { OwnerInfoService } from './owner-info.service';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';
import { UpdateOwnerBankDto } from './dto/update-owner-bank.dto';

type JwtUserPayload = {
  userId?: number;
  sub?: number;
  email?: string;
};

@Controller('owner')
@UseGuards(AuthGuard('jwt'))
export class OwnerInfoController {
  constructor(private readonly ownerInfoService: OwnerInfoService) {}

  private getUserFromRequest(req: Request): { userId: number; email: string } {
    const user = (req.user || {}) as JwtUserPayload;

    const userId = user.userId ?? user.sub;
    const email = user.email ?? '';

    if (!userId) {
      throw new UnauthorizedException('Missing user id in JWT payload');
    }

    return { userId, email };
  }

  // -------- PROFILE --------

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const { userId, email } = this.getUserFromRequest(req);
    return this.ownerInfoService.getOwnerProfile(userId, email);
  }

  @Post('profile/update')
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateOwnerProfileDto,
  ) {
    const { userId, email } = this.getUserFromRequest(req);
    return this.ownerInfoService.updateOwnerProfile(userId, email, dto);
  }

  // -------- BANK INFO --------

  @Get('bank')
  async getBank(@Req() req: Request) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.getOwnerBank(userId);
  }

  @Post('bank/update')
  async updateBank(@Req() req: Request, @Body() dto: UpdateOwnerBankDto) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.updateOwnerBank(userId, dto);
  }

  // -------- IDENTITY VERIFICATION --------

  @Get('verification')
  async getVerification(@Req() req: Request) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.getOwnerVerification(userId);
  }

  @Post('verification/start')
  async startVerification(@Req() req: Request) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.startOwnerVerification(userId);
  }
}
