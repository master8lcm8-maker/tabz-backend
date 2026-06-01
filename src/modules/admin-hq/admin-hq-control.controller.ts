import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AdminControlSection = {
  key: string;
  label: string;
  table: string;
  tableExists: boolean;
  total: number | null;
  recent: any[];
  controlState: 'LIVE_TABLE' | 'TABLE_MISSING';
  limitation?: string;
};

@Controller('admin')
export class AdminHqControlController {
  constructor(private readonly dataSource: DataSource) {}

  // ADMIN_HQ_CONTROL_CONTROLLER_26K1Y
  private assertAdmin(req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      throw new ForbiddenException('Only admins can access Admin HQ control routes.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('refunds')
  async listRefunds(@Req() req: any) {
    this.assertAdmin(req);
    return this.section({
      key: 'refunds',
      label: 'Refund control',
      table: 'refunds',
      limitation: 'Dedicated refunds table not present unless tableExists=true. Wallet/cashout refund controls are handled by /wallet/admin/cashouts.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('disputes')
  async listDisputes(@Req() req: any) {
    this.assertAdmin(req);
    return this.section({
      key: 'disputes',
      label: 'Dispute control',
      table: 'disputes',
      limitation: 'Dedicated disputes table not present unless tableExists=true.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('final-resolution')
  async listFinalResolution(@Req() req: any) {
    this.assertAdmin(req);
    return {
      ok: true,
      scope: 'admin_final_resolution_control',
      protectedBy: 'JwtAuthGuard + admin role',
      sections: [
        await this.section({
          key: 'cashout_requests',
          label: 'Cashout final states',
          table: 'cashout_requests',
          limitation: 'Final states are visible through cashout status until a dedicated final-resolution table exists.',
        }),
        await this.section({
          key: 'freeboard_drops',
          label: 'FreeBoard final states',
          table: 'freeboard_drops',
          limitation: 'Final states are derived from FreeBoard status values.',
        }),
        await this.section({
          key: 'food_orders',
          label: 'Food order final states',
          table: 'food_orders',
          limitation: 'Final states are derived from food order status values.',
        }),
        await this.section({
          key: 'store_item_orders',
          label: 'Store item order final states',
          table: 'store_item_orders',
          limitation: 'Final states are derived from store item order status values.',
        }),
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('payouts')
  async listPayouts(@Req() req: any) {
    this.assertAdmin(req);
    return {
      ok: true,
      scope: 'admin_payout_control',
      protectedBy: 'JwtAuthGuard + admin role',
      canonicalRail: 'wallet_cashouts',
      deprecatedPayoutsNote: 'Legacy /owner/payouts source is deprecated; use wallet/cashout control for ledger-safe payout handling.',
      sections: [
        await this.section({
          key: 'cashout_requests',
          label: 'Cashout payout records',
          table: 'cashout_requests',
          limitation: 'Admin payout control is handled through /wallet/admin/cashouts routes.',
        }),
        await this.section({
          key: 'payouts',
          label: 'Legacy payout records',
          table: 'payouts',
          limitation: 'Legacy payouts are deprecated and should not be the primary production control rail.',
        }),
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('stripe-events')
  async listStripeEvents(@Req() req: any) {
    this.assertAdmin(req);
    return this.section({
      key: 'stripe_events',
      label: 'Stripe/payment events',
      table: 'stripe_events',
      limitation: 'Stripe events require a dedicated event table. If missing, provider event visibility remains YELLOW.',
    });
  }

  // ADMIN_HQ_REAL_MUTATIONS_26K2L
  @UseGuards(JwtAuthGuard)
  @Post('refunds/:id/approve')
  async approveRefund(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req);

    const refundId = this.requirePositiveId(id, 'refund id');
    const adminUserId = this.adminUserId(req);
    const adminNote = this.optionalText(body?.adminNote ?? body?.note ?? body?.reason);

    const rows = await this.dataSource.query(
      `UPDATE "refunds"
       SET "status" = $2,
           "adminNote" = COALESCE($3, "adminNote"),
           "approvedByAdminUserId" = $4,
           "approvedAt" = now(),
           "resolvedAt" = now(),
           "updatedAt" = now()
       WHERE "id" = $1
       RETURNING *`,
      [refundId, 'APPROVED', adminNote, adminUserId],
    );

    if (!rows?.length) {
      throw new NotFoundException('Refund not found.');
    }

    return {
      ok: true,
      scope: 'admin_refund_control',
      action: 'refund_approve',
      status: 'APPROVED',
      id: refundId,
      record: rows[0],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('disputes/:id/resolve')
  async resolveDispute(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req);

    const disputeId = this.requirePositiveId(id, 'dispute id');
    const adminUserId = this.adminUserId(req);
    const resolution = this.optionalText(body?.resolution ?? body?.reason) ?? 'ADMIN_RESOLVED';

    const rows = await this.dataSource.query(
      `UPDATE "disputes"
       SET "status" = $2,
           "resolution" = $3,
           "resolvedByAdminUserId" = $4,
           "resolvedAt" = now(),
           "updatedAt" = now()
       WHERE "id" = $1
       RETURNING *`,
      [disputeId, 'RESOLVED', resolution, adminUserId],
    );

    if (!rows?.length) {
      throw new NotFoundException('Dispute not found.');
    }

    return {
      ok: true,
      scope: 'admin_dispute_control',
      action: 'dispute_resolve',
      status: 'RESOLVED',
      id: disputeId,
      record: rows[0],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('final-resolution/:id')
  async finalizeResolution(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req);

    const resolutionId = this.requirePositiveId(id, 'final resolution id');
    const adminUserId = this.adminUserId(req);
    const resolution = this.optionalText(body?.resolution) ?? 'ADMIN_RESOLVED';
    const status = this.optionalText(body?.status) ?? 'RESOLVED';
    const reason = this.optionalText(body?.reason);
    const adminNote = this.optionalText(body?.adminNote ?? body?.note);

    const rows = await this.dataSource.query(
      `UPDATE "final_resolutions"
       SET "status" = $2,
           "resolution" = $3,
           "reason" = COALESCE($4, "reason"),
           "adminNote" = COALESCE($5, "adminNote"),
           "resolvedByAdminUserId" = $6,
           "resolvedAt" = now(),
           "updatedAt" = now()
       WHERE "id" = $1
       RETURNING *`,
      [resolutionId, status, resolution, reason, adminNote, adminUserId],
    );

    if (!rows?.length) {
      throw new NotFoundException('Final resolution record not found.');
    }

    return {
      ok: true,
      scope: 'admin_final_resolution_mutation',
      action: 'final_resolution',
      status,
      resolution,
      id: resolutionId,
      record: rows[0],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('payouts/:id/fail')
  async failPayout(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req);
    return this.notImplementedControl('payout_fail', id, body, 'Use /wallet/admin/cashouts/:id/fail for ledger-safe cashout failure control.');
  }

  @UseGuards(JwtAuthGuard)
  @Post('payouts/:id/complete')
  async completePayout(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req);
    return this.notImplementedControl('payout_complete', id, body, 'Use /wallet/admin/cashouts/:id/complete for ledger-safe cashout completion control.');
  }

  private notImplementedControl(action: string, id: string, body: any, reason: string) {
    const numericId = Number(id);

    return {
      ok: false,
      scope: 'admin_hq_control_action',
      action,
      id: Number.isFinite(numericId) ? numericId : id,
      status: 'CONTROL_NOT_IMPLEMENTED',
      reason,
      receivedBodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
    };
  }

  private requirePositiveId(raw: string, label: string): number {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException(`Invalid ${label}.`);
    }
    return id;
  }

  private adminUserId(req: any): number | null {
    const id = Number(req?.user?.sub ?? req?.user?.userId ?? req?.user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed.slice(0, 2000) : null;
  }

  private async section(input: {
    key: string;
    label: string;
    table: string;
    limitation?: string;
  }): Promise<AdminControlSection> {
    const exists = await this.tableExists(input.table);

    if (!exists) {
      return {
        key: input.key,
        label: input.label,
        table: input.table,
        tableExists: false,
        total: null,
        recent: [],
        controlState: 'TABLE_MISSING',
        limitation: input.limitation,
      };
    }

    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM ${this.q(input.table)}`,
    );

    const recent = await this.dataSource.query(
      `SELECT * FROM ${this.q(input.table)} ORDER BY ${await this.bestOrderColumn(input.table)} DESC LIMIT 10`,
    );

    return {
      key: input.key,
      label: input.label,
      table: input.table,
      tableExists: true,
      total: Number(totalRows?.[0]?.total ?? 0),
      recent,
      controlState: 'LIVE_TABLE',
      limitation: input.limitation,
    };
  }

  private async tableExists(table: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT to_regclass($1) AS name`,
      [`public.${table}`],
    );
    return Boolean(rows?.[0]?.name);
  }

  private async bestOrderColumn(table: string): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name IN ('updatedAt', 'createdAt', 'id')
       ORDER BY CASE column_name
         WHEN 'updatedAt' THEN 1
         WHEN 'createdAt' THEN 2
         WHEN 'id' THEN 3
         ELSE 4
       END
       LIMIT 1`,
      [table],
    );

    return this.q(String(rows?.[0]?.column_name || 'id'));
  }

  private q(identifier: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
      throw new Error(`Unsafe SQL identifier: ${identifier}`);
    }

    return `"${identifier}"`;
  }
}

