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
  // User resolver (JWT-first, with safe fallbacks)
  // --------------------------------------------------
  private getUserId(req: any): number {
    const jwtUser = req?.user as any;

    // ✅ FIX: support common payload shapes: { id }, { userId }, { sub }
    const jwtVal = Number(jwtUser?.userId ?? jwtUser?.sub ?? jwtUser?.id);

    // If JwtAuthGuard passed, we MUST have a valid user id.
    if (Number.isFinite(jwtVal) && jwtVal > 0) return jwtVal;

    // ❌ Do NOT allow x-user-id fallback in guarded routes.
    // If this happens, your JwtStrategy validate() is not returning an id.
    throw new ForbiddenException('Invalid auth context: missing user id');
  }

  // --------------------------------------------------
  // BASIC SUMMARY
  // --------------------------------------------------
  @Get('summary')
  async getSummary(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.getSummary(userId);
  }

  // --------------------------------------------------
  // DEPOSIT
  // --------------------------------------------------
  @Post('deposit')
  async deposit(@Req() req, @Body() body: { amountCents: number }) {
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
    const userId = this.getUserId(req);

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

    // 1) Parse amount safely
    const rawAmount = body?.amountCents;
    const amount = Math.floor(Number(rawAmount));

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        'Cashout amount must be a positive number of cents.',
      );
    }

    // 2) Enforce a minimum cashout (e.g. $5.00)
    const minAmountCents = 500;
    if (amount < minAmountCents) {
      throw new BadRequestException(
        `Minimum cashout is ${minAmountCents} cents ($${(
          minAmountCents / 100
        ).toFixed(2)}).`,
      );
    }

    // 3) Enforce "not more than available cashout balance"
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

    // 4) Delegate to WalletService
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
  }

  // --------------------------------------------------
  // M6: UNIFIED CASHOUT HISTORY (canonical)
  // GET /wallet/cashouts?status=pending|completed|failed
  // --------------------------------------------------
  @Get('cashouts')
  async getCashouts(@Req() req, @Query('status') status?: string) {
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, status ?? null);
  }

  // --------------------------------------------------
  // GET /wallet/cashouts/:id
  // --------------------------------------------------
  @Get('cashouts/:id')
  async getCashoutById(@Req() req, @Param('id') id: string) {
    // ✅ FIX: log must be INSIDE the function body
    console.log(
      '[GET /wallet/cashouts/:id]',
      'jwtUser=',
      req?.user,
      'x-user-id=',
      req?.headers?.['x-user-id'],
      'resolvedUserId=',
      this.getUserId(req),
    );

    const userId = this.getUserId(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }

    return this.walletService.getCashoutForUserById(userId, cashoutId);
  }

  // --------------------------------------------------
  // M6: EXPLICIT FAILED ENDPOINT (canonical)
  // --------------------------------------------------
  @Get('cashouts/failed')
  async getFailedCashouts(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, 'failed');
  }

  // --------------------------------------------------
  // 🔥 ADMIN: COMPLETE CASHOUT
  // --------------------------------------------------
  @Post('cashouts/:id/complete')
  async completeCashout(@Param('id') id: string) {
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }

    const cashout = await this.walletService.adminCompleteCashout(cashoutId);

    return {
      id: cashout.id,
      walletId: cashout.walletId,
      amountCents: Number(cashout.amountCents),
      status: cashout.status,
      failureReason: cashout.failureReason,
      destinationLast4: cashout.destinationLast4 ?? null,
      createdAt: cashout.createdAt,
    };
  }

  // --------------------------------------------------
  // 🔥 ADMIN: FAIL CASHOUT
  // --------------------------------------------------
  @Post('cashouts/:id/fail')
  async failCashout(
    @Param('id') id: string,
    @Body() body: { failureReason?: string },
  ) {
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }

    const reason = body.failureReason ?? 'Cashout failed';

    const cashout = await this.walletService.adminFailCashout(cashoutId, reason);

    return {
      id: cashout.id,
      walletId: cashout.walletId,
      amountCents: Number(cashout.amountCents),
      status: cashout.status,
      failureReason: cashout.failureReason,
      destinationLast4: cashout.destinationLast4 ?? null,
      createdAt: cashout.createdAt,
    };
  }

  // --------------------------------------------------
  // ✅ ADMIN/DEV: REPAIR FAILED CASHOUT REFUND (FV-10)
  // POST /wallet/cashouts/:id/repair-refund
  // --------------------------------------------------
  @Post('cashouts/:id/repair-refund')
  async repairFailedCashoutRefund(@Param('id') id: string) {
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }

    const cashout = await this.walletService.adminRepairFailedCashoutRefund(
      cashoutId,
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
  }

  // --------------------------------------------------
  // OWNER: CANCEL OWN CASHOUT (PENDING → FAILED + REFUND)
  // --------------------------------------------------
  @Post('cashouts/:id/cancel')
  async cancelOwnCashout(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }

    const cashout = await this.walletService.cancelCashout(userId, cashoutId);

    return {
      id: cashout.id,
      walletId: cashout.walletId,
      amountCents: Number(cashout.amountCents),
      status: cashout.status,
      failureReason: cashout.failureReason,
      destinationLast4: cashout.destinationLast4 ?? null,
      createdAt: cashout.createdAt,
    };
  }

  // --------------------------------------------------
  // OWNER: RETRY FAILED CASHOUT (CREATES NEW PENDING)
  // --------------------------------------------------
  @Post('cashouts/:id/retry')
  async retryOwnCashout(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const cashoutId = Number(id);
    if (!Number.isFinite(cashoutId) || cashoutId <= 0) {
      throw new BadRequestException('Invalid cashout id');
    }

    const cashout = await this.walletService.retryCashout(userId, cashoutId);

    return {
      id: cashout.id,
      walletId: cashout.walletId,
      amountCents: Number(cashout.amountCents),
      status: cashout.status,
      failureReason: cashout.failureReason,
      destinationLast4: cashout.destinationLast4 ?? null,
      createdAt: cashout.createdAt,
    };
  }

  // --------------------------------------------------
  // DEV TOOL — Add Direct Balance
  // --------------------------------------------------
  @Post('dev/add-cashout-balance')
  async devAddCashout(@Req() req, @Body() body: { amountCents: number }) {
    const userId = this.getUserId(req);
    const amount = Number(body?.amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    return this.walletService.devAddCashoutBalance(userId, amount);
  }

  // --------------------------------------------------
  // 🔥 OWNER METRICS FOR DASHBOARD
  // --------------------------------------------------
  @Get('metrics')
  async getMetrics(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.getCashoutMetrics(userId);
  }

  // --------------------------------------------------
  // 🔥 NEXT PAYOUT
  // --------------------------------------------------
  @Get('next-payout')
  async getNextPayout(@Req() req) {
    const userId = this.getUserId(req);
    const next = await this.walletService.getNextPayout(userId);
    return { next: next ?? null };
  }

  // --------------------------------------------------
  // ✅ TRANSACTIONS (THIS WAS MISSING — causes 404)
  // GET /wallet/transactions
  // --------------------------------------------------
  @Get('transactions')
  async getTransactions(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.getTransactionsForUser(userId);
  }

  // --------------------------------------------------
  // M6: BACK-COMPAT / UI ENDPOINTS (canonical, user-scoped)
  // --------------------------------------------------
  @Get('cashouts/pending')
  async getPendingCashouts(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, 'pending');
  }

  @Get('cashouts/completed')
  async getCompletedCashouts(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.listCashoutsCanonical(userId, 'completed');
  }
}
