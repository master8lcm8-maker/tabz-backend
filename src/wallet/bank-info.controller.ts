// src/wallet/bank-info.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BankInfoService } from './bank-info.service';

@Controller('wallet/bank-info')
@UseGuards(AuthGuard('jwt'))
export class BankInfoController {
  constructor(private readonly bankInfoService: BankInfoService) {}

  // --------------------------------------------------
  // JWT is the ONLY source of truth for bank ownership
  // OWNER-ONLY lane (staff must be blocked)
  // --------------------------------------------------
  private getOwnerUserId(req: any): number {
    const userId = Number(req?.user?.sub ?? req?.user?.userId ?? req?.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid or missing JWT user');
    }

    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'owner') {
      // ✅ Staff/buyer MUST NOT access bank-info
      throw new ForbiddenException('owner_only');
    }

    return userId;
  }

  @Get()
  async getMyBankInfo(@Req() req: any) {
    const userId = this.getOwnerUserId(req);
    const info = await this.bankInfoService.getForUser(userId);
    return info ?? {};
  }

  @Post()
  async setMyBankInfo(
    @Req() req: any,
    @Body()
    body: {
      bankName: string;
      accountHolderName: string;
      routingNumber: string;
      accountNumber: string;
    },
  ) {
    const userId = this.getOwnerUserId(req);
    return this.bankInfoService.setForUser(userId, body);
  }
}
