// src/wallet/wallet.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { GetUser } from '../modules/auth/get-user.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // GET /wallet/summary
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  getSummary(@GetUser() user: any) {
    // user.sub is the userId from JWT
    return this.walletService.getSummary(user.sub);
  }

  // POST /wallet/deposit
  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  deposit(@GetUser() user: any, @Body() dto: any) {
    return this.walletService.deposit(user.sub, dto.amountCents);
  }

  // POST /wallet/spend
  @UseGuards(JwtAuthGuard)
  @Post('spend')
  spend(@GetUser() user: any, @Body() dto: any) {
    // dto.amountCents is the amount
    return this.walletService.spend(user.sub, dto.amountCents);
  }

  // POST /wallet/transfer
  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  transfer(@GetUser() user: any, @Body() dto: any) {
    // dto.receiverId, dto.amountCents
    return this.walletService.transfer(user.sub, dto.receiverId, dto.amountCents);
  }

  // POST /wallet/cashout
  @UseGuards(JwtAuthGuard)
  @Post('cashout')
  cashout(@GetUser() user: any, @Body() dto: any) {
    return this.walletService.cashout(user.sub, dto.amountCents);
  }

  // GET /wallet/user/:id  (debug/admin)
  @Get('user/:id')
  getWalletByUser(@Param('id') userId: string) {
    return this.walletService.getWalletForUser(Number(userId));
  }
}
