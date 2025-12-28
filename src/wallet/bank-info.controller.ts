// src/wallet/bank-info.controller.ts
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
import { BankInfoService } from './bank-info.service';

@Controller('wallet/bank-info')
@UseGuards(AuthGuard('jwt'))
export class BankInfoController {
  constructor(private readonly bankInfoService: BankInfoService) {}

  // --------------------------------------------------
  // JWT is the ONLY source of truth for bank ownership
  // --------------------------------------------------
  private getUserId(req: any): number {
    const userId = Number(req?.user?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid or missing JWT user');
    }
    return userId;
  }

  @Get()
  async getMyBankInfo(@Req() req) {
    const userId = this.getUserId(req);
    const info = await this.bankInfoService.getForUser(userId);
    return info ?? {};
  }

  @Post()
  async setMyBankInfo(
    @Req() req,
    @Body()
    body: {
      bankName: string;
      accountHolderName: string;
      routingNumber: string;
      accountNumber: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.bankInfoService.setForUser(userId, body);
  }
}
