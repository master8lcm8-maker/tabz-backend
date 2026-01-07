// src/wallet/wallet.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Query,
  HttpException, // ✅ M31.1: preserve upstream status codes
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CashoutRequest } from './cashout-request.entity';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { IdentityService } from '../identity/identity.service';
import { BankInfoService } from './bank-info.service';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly identityService: IdentityService,
    private readonly bankInfoService: BankInfoService,
  ) {}

  // --------------------------------------------------
  // Auth/role gate: Wallet is OWNER/BUYER only (STAFF forbidden)
  // --------------------------------------------------
  private assertWalletRole(req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (!role) throw new ForbiddenException('forbidden_role');
    if (role === 'staff') throw new ForbiddenException('staff_forbidden');
    if (role !== 'buyer' && role !== 'owner') {
      throw new ForbiddenException('forbidden_role');
    }
  }

  // --------------------------------------------------
  // User resolver (JWT-first, NO header fallbacks)
  // --------------------------------------------------
  private getUserId(req: any): number {
    const jwtUser = req?.user as any;
    const jwtVal = Number(jwtUser?.userId ?? jwtUser?.sub ?? jwtUser?.id);
    if (Number.isFinite(jwtVal) && jwtVal > 0) return jwtVal;
    throw new ForbiddenException('Invalid auth context: missing user id');
  }

  // --------------------------------------------------
  // BASIC SUMMARY
  // --------------------------------------------------
  @Get('summary')
  async getSummary(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.getSummary(userId);
  }

  // --------------------------------------------------
  // DEPOSIT
  // --------------------------------------------------
  @Post('deposit')
  async deposit(@Req() req, @Body() body: { amountCents: number }) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    const amount = Number(body?.amountCents);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid deposit amount');
    }

    return this.walletService.deposit(userId, amount);
  }

  // --------------------------------------------------
  // TRANSFER
  // --------------------------------------------------
  @Post('transfer')
  async transfer(
    @Req() req,
    @Body() body: { receiverId: number; amountCents: number },
  ) {
    this.assertWalletRole(req);
    const senderId = this.getUserId(req);
    const receiverId = Number(body?.receiverId);
    const amount = Number(body?.amountCents);

    if (!Number.isFinite(receiverId) || receiverId <= 0) {
      throw new BadRequestException('Invalid receiverId');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid transfer amount');
    }

    await this.walletService.transfer(senderId, receiverId, amount);
    return { success: true };
  }

  // --------------------------------------------------
  // CREATE CASHOUT REQUEST (CUSTOM AMOUNT)
  // GATED: requires bank info + identity verified
  // --------------------------------------------------
  @Post('cashout')
  async cashout(@Req() req, @Body() body: { amountCents: number }) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);

    try {
      // ===== GATE 1: Identity must be verified =====
      const identity: any = await this.identityService.getStatus(userId);
      if (identity?.status !== 'verified') {
        throw new ForbiddenException(
          'Identity verification is required before cashouts.',
        );
      }

      // ===== GATE 2: Bank info must exist =====
      const bank = await this.bankInfoService.getForUser(userId);
      if (!bank) {
        throw new ForbiddenException(
          'Bank information is required before cashouts.',
        );
      }

      const rawAmount = body?.amountCents;
      const amount = Math.floor(Number(rawAmount));

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(
          'Cashout amount must be a positive number of cents.',
        );
      }

      const minAmountCents = 500;
      if (amount < minAmountCents) {
        throw new BadRequestException(
          `Minimum cashout is ${minAmountCents} cents ($${(
            minAmountCents / 100
          ).toFixed(2)}).`,
        );
      }

      const summary = await this.walletService.getSummary(userId);
      const available = Number(summary.cashoutAvailableCents);

      if (!Number.isFinite(available) || available <= 0) {
        throw new BadRequestException('No cashout-ready balance available.');
      }

      if (amount > available) {
        throw new BadRequestException(
          `Cashout amount exceeds available cashout balance (${available} cents).`,
        );
      }

      const cashout: CashoutRequest = await this.walletService.cashout(
        userId,
        amount,
      );

      return {
        id: cashout.id,
        walletId: cashout.walletId,
        amountCents: Number(cashout.amountCents),
        status: cashout.status,
        failureReason: cashout.failureReason,
        destinationLast4: cashout.destinationLast4 ?? null,
        createdAt: cashout.createdAt,
      };
    } catch (e: any) {
      // 🔒 M30: FORCE JSON ERROR BODY (NO BEHAVIOR CHANGE)
      // eslint-disable-next-line no-console
      console.error('[wallet.cashout] error', e);

      const detail = e?.response?.message ?? e?.message ?? 'Unknown cashout failure';

      // ✅ M31.1 FIX:
      // Preserve the original status code on the HTTP transport
      // while still returning our structured JSON body.
      const status = Number(e?.status);
      const httpStatus = Number.isFinite(status) && status > 0 ? status : 400;

      throw new HttpException(
        {
          message: 'cashout_failed',
          detail,
          name: e?.name ?? null,
          status: e?.status ?? null,
        },
        httpStatus,
      );
    }
  }

  // --------------------------------------------------
  // M6: UNIFIED CASHOUT HISTORY (canonical)
  // --------------------------------------------------
  @Get('cashouts')
  async getCashouts(@Req() req, @Query('status') status?: string) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, status ?? null);
  }

  @Get('cashouts/:id')
  async getCashoutById(@Req() req, @Param('id') id: string) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }
    return this.walletService.getCashoutForUserById(userId, cashoutId);
  }

  @Get('cashouts/failed')
  async getFailedCashouts(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, 'failed');
  }

  @Post('cashouts/:id/complete')
  async completeCashout(@Req() req, @Param('id') id: string) {
    this.assertWalletRole(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }
    const cashout = await this.walletService.adminCompleteCashout(cashoutId);
    return cashout;
  }

  @Post('cashouts/:id/fail')
  async failCashout(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { failureReason?: string },
  ) {
    this.assertWalletRole(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }
    return this.walletService.adminFailCashout(
      cashoutId,
      body.failureReason ?? 'Cashout failed',
    );
  }

  @Post('cashouts/:id/repair-refund')
  async repairFailedCashoutRefund(@Req() req, @Param('id') id: string) {
    this.assertWalletRole(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }
    return this.walletService.adminRepairFailedCashoutRefund(cashoutId);
  }

  @Post('cashouts/:id/cancel')
  async cancelOwnCashout(@Req() req, @Param('id') id: string) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }
    return this.walletService.cancelCashout(userId, cashoutId);
  }

  @Post('cashouts/:id/retry')
  async retryOwnCashout(@Req() req, @Param('id') id: string) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }
    return this.walletService.retryCashout(userId, cashoutId);
  }

  @Post('dev/add-cashout-balance')
  async devAddCashout(@Req() req, @Body() body: { amountCents: number }) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    const amount = Number(body?.amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    return this.walletService.devAddCashoutBalance(userId, amount);
  }

  @Post('unlock-spendable')
  async unlockSpendable(@Req() req, @Body() body: { amountCents: number }) {
    this.assertWalletRole(req);
    if (String(req?.user?.role).toLowerCase() !== 'buyer') {
      throw new ForbiddenException('buyer_only');
    }
    const userId = this.getUserId(req);
    const amount = Number(body?.amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amountCents must be a positive number');
    }
    return this.walletService.unlockSpendableBalance(userId, amount);
  }

  @Get('metrics')
  async getMetrics(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.getCashoutMetrics(userId);
  }

  @Get('next-payout')
  async getNextPayout(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return { next: (await this.walletService.getNextPayout(userId)) ?? null };
  }

  @Get('transactions')
  async getTransactions(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.getTransactionsForUser(userId);
  }

  @Get('cashouts/pending')
  async getPendingCashouts(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, 'pending');
  }

  @Get('cashouts/completed')
  async getCompletedCashouts(@Req() req) {
    this.assertWalletRole(req);
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, 'completed');
  }
}
