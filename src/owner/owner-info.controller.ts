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

type OwnerJwtRequest = Request & {
  user?: JwtUserPayload;
};

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

  private getUserFromRequest(req: OwnerJwtRequest): { userId: number; email: string } {
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
  async getProfile(@Req() req: OwnerJwtRequest) {
    const { userId, email } = this.getUserFromRequest(req);
    return this.ownerInfoService.getOwnerProfile(userId, email);
  }

  @Post('profile/update')
  async updateProfile(
    @Req() req: OwnerJwtRequest,
    @Body() dto: UpdateOwnerProfileDto,
  ) {
    const { userId, email } = this.getUserFromRequest(req);
    return this.ownerInfoService.updateOwnerProfile(userId, email, dto);
  }

  // -------- BANK INFO --------

  @Get('bank')
  async getBank(@Req() req: OwnerJwtRequest) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.getOwnerBank(userId);
  }

  @Post('bank/update')
  async updateBank(@Req() req: OwnerJwtRequest, @Body() dto: UpdateOwnerBankDto) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.updateOwnerBank(userId, dto);
  }

  // -------- STRIPE --------

  @Post('stripe/account')
  async createOrGetStripeAccount(@Req() req: OwnerJwtRequest) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.createOrGetStripeAccount(userId);
  }


  

  

  @Post('stripe/onboarding')
  async createStripeOnboardingLink(@Req() req: OwnerJwtRequest) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.createStripeOnboardingLink(userId);
  }

  @Get('stripe/status')
  async getStripeStatus(@Req() req: OwnerJwtRequest) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.refreshStripeAccountStatus(userId);
  }
  // -------- IDENTITY VERIFICATION --------

  @Get('verification')
  async getVerification(@Req() req: OwnerJwtRequest) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.getOwnerVerification(userId);
  }

  @Post('verification/start')
  async startVerification(@Req() req: OwnerJwtRequest) {
    const { userId } = this.getUserFromRequest(req);
    return this.ownerInfoService.startOwnerVerification(userId);
  }
}




