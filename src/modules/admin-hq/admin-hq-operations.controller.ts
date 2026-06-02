import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AdminOperationSection = {
  key: string;
  label: string;
  table: string;
  statusColumn?: string;
  total: number | null;
  byStatus: Record<string, number>;
  recent: any[];
  error?: string;
};

@Controller('admin-hq')
export class AdminHqOperationsController {
  constructor(private readonly dataSource: DataSource) {}

  // ADMIN_HQ_OPERATIONS_CONTROLLER_26K1Q
  private assertAdmin(req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      throw new ForbiddenException('Only admins can access Admin HQ operations.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('operations')
  async getOperations(@Req() req: any) {
    this.assertAdmin(req);

    const sections = await Promise.all([
      this.section({
        key: 'freeboard',
        label: 'FreeBoard',
        table: 'freeboard_drops',
        statusColumn: 'status',
      }),
      this.section({
        key: 'food_orders',
        label: 'Food/orders',
        table: 'food_orders',
        statusColumn: 'status',
      }),
      this.section({
        key: 'store_item_orders',
        label: 'Store item orders',
        table: 'store_item_orders',
        statusColumn: 'status',
      }),
      this.section({
        key: 'drink_orders',
        label: 'QR/drink redemptions',
        table: 'drink_orders',
        statusColumn: 'status',
      }),
      this.section({
        key: 'credits_transfers',
        label: 'Gifts / credit transfers',
        table: 'credits_transfer',
        statusColumn: 'status',
      }),
      this.section({
        key: 'credits_ledger',
        label: 'Ledger entries',
        table: 'credits_ledger_entry',
        statusColumn: 'type',
      }),
      this.section({
        key: 'wallet_transactions',
        label: 'Wallet / payout records',
        table: 'wallet_transactions',
        statusColumn: 'type',
      }),
      this.section({
        key: 'cashout_requests',
        label: 'Cashout / payout requests',
        table: 'cashout_requests',
        statusColumn: 'status',
      }),
      this.section({
        key: 'referral_links',
        label: 'Referral links',
        table: 'referral_links',
        statusColumn: 'status',
      }),
      this.section({
        key: 'referral_events',
        label: 'Referral events',
        table: 'referral_events',
        statusColumn: 'eventType',
      }),
      this.section({
        key: 'notifications',
        label: 'Notifications / lifecycle alerts',
        table: 'notifications',
        statusColumn: 'status',
      }),
    ]);

    return {
      ok: true,
      scope: 'phase26_admin_hq_operations_visibility',
      protectedBy: 'JwtAuthGuard + admin role',
      adminUserId: req?.user?.sub ?? req?.user?.userId ?? null,
      adminRole: req?.user?.role ?? null,
      requiredTargets: [
        'Gifts',
        'FreeBoard',
        'Food/orders',
        'QR/redemptions',
        'Entitlements',
        'Refunds',
        'Expirations',
        'Disputes',
        'Final resolution',
        'Wallet/payout records',
        'Stripe/payment events if applicable',
      ],
      limitations: {
        stripePaymentEvents: 'not included unless Stripe event table exists in current schema',
        finalResolution: 'derived from visible status/type fields until dedicated final-resolution table exists',
        disputesRefundsExpirations: 'surfaced where existing status/type fields contain those states',
      },
      sections,
    };
  }

  private async section(input: {
    key: string;
    label: string;
    table: string;
    statusColumn?: string;
  }): Promise<AdminOperationSection> {
    try {
      const exists = await this.tableExists(input.table);
      if (!exists) {
        return {
          key: input.key,
          label: input.label,
          table: input.table,
          statusColumn: input.statusColumn,
          total: null,
          byStatus: {},
          recent: [],
          error: 'table_not_found',
        };
      }

      const totalRows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM ${this.q(input.table)}`,
      );

      const byStatus = input.statusColumn
        ? await this.statusCounts(input.table, input.statusColumn)
        : {};

      const recent = await this.dataSource.query(
        `SELECT * FROM ${this.q(input.table)} ORDER BY ${await this.bestOrderColumn(input.table)} DESC LIMIT 10`,
      );

      return {
        key: input.key,
        label: input.label,
        table: input.table,
        statusColumn: input.statusColumn,
        total: Number(totalRows?.[0]?.total ?? 0),
        byStatus,
        recent,
      };
    } catch (err: any) {
      return {
        key: input.key,
        label: input.label,
        table: input.table,
        statusColumn: input.statusColumn,
        total: null,
        byStatus: {},
        recent: [],
        error: String(err?.message || err),
      };
    }
  }

  private async tableExists(table: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT to_regclass($1) AS name`,
      [`public.${table}`],
    );
    return Boolean(rows?.[0]?.name);
  }

  private async statusCounts(table: string, column: string): Promise<Record<string, number>> {
    const safeTable = this.q(table);
    const safeColumn = this.q(column);

    const rows = await this.dataSource.query(
      `SELECT COALESCE(${safeColumn}::text, 'NULL') AS status, COUNT(*)::int AS count
       FROM ${safeTable}
       GROUP BY COALESCE(${safeColumn}::text, 'NULL')
       ORDER BY count DESC`,
    );

    return Object.fromEntries(
      (rows || []).map((row: any) => [String(row.status), Number(row.count || 0)]),
    );
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

  private async adminHq46TableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) AS "exists"
      `,
      [tableName],
    );

    return rows?.[0]?.exists === true || rows?.[0]?.exists === 'true';
  }

  private async adminHq46Count(tableName: string): Promise<number | null> {
    if (!(await this.adminHq46TableExists(tableName))) return null;

    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM "${tableName}"`,
    );

    return Number(rows?.[0]?.total ?? 0);
  }

  private async adminHq46Recent(tableName: string, limit = 10): Promise<any[]> {
    if (!(await this.adminHq46TableExists(tableName))) return [];

    const safeLimit = Math.max(1, Math.min(Number(limit || 10), 25));

    return this.dataSource.query(
      `SELECT * FROM "${tableName}" ORDER BY id DESC LIMIT ${safeLimit}`,
    );
  }

  private adminHq46ProjectUser(row: any) {
    return {
      id: row?.id ?? null,
      email: row?.email ?? null,
      displayName: row?.displayName ?? row?.display_name ?? null,
      role: row?.role ?? null,
      isActive: row?.isActive ?? row?.is_active ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  private adminHq46ProjectVenue(row: any) {
    return {
      id: row?.id ?? null,
      ownerId: row?.ownerId ?? row?.owner_id ?? null,
      ownerProfileId: row?.ownerProfileId ?? row?.owner_profile_id ?? null,
      slug: row?.slug ?? null,
      name: row?.name ?? null,
      city: row?.city ?? null,
      state: row?.state ?? null,
      country: row?.country ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  private adminHq46ProjectStaff(row: any) {
    return {
      id: row?.id ?? null,
      venueId: row?.venueId ?? row?.venue_id ?? null,
      name: row?.name ?? null,
      email: row?.email ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  private adminHq46ProjectProfile(row: any) {
    return {
      id: row?.id ?? null,
      userId: row?.userId ?? row?.user_id ?? null,
      type: row?.type ?? null,
      displayName: row?.displayName ?? row?.display_name ?? null,
      slug: row?.slug ?? null,
      isActive: row?.isActive ?? row?.is_active ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  async adminHqAccounts(@Req() req: any) {
    this.assertAdmin(req);
    const adminUserId =
      Number(req?.user?.sub ?? req?.user?.id ?? req?.user?.userId ?? 0) || null;
    const adminRole = String(req?.user?.role ?? 'admin');

    const [
      usersTotal,
      venuesTotal,
      staffTotal,
      profilesTotal,
      recentUsersRaw,
      recentVenuesRaw,
      recentStaffRaw,
      recentProfilesRaw,
    ] = await Promise.all([
      this.adminHq46Count('users'),
      this.adminHq46Count('venues'),
      this.adminHq46Count('staff'),
      this.adminHq46Count('profiles'),
      this.adminHq46Recent('users', 10),
      this.adminHq46Recent('venues', 10),
      this.adminHq46Recent('staff', 10),
      this.adminHq46Recent('profiles', 10),
    ]);

    const recentUsers = recentUsersRaw.map((row: any) =>
      this.adminHq46ProjectUser(row),
    );
    const recentVenues = recentVenuesRaw.map((row: any) =>
      this.adminHq46ProjectVenue(row),
    );
    const recentStaff = recentStaffRaw.map((row: any) =>
      this.adminHq46ProjectStaff(row),
    );
    const recentProfiles = recentProfilesRaw.map((row: any) =>
      this.adminHq46ProjectProfile(row),
    );

    return {
      ok: true,
      scope: 'admin_hq_accounts_operations',
      protectedBy: 'JwtAuthGuard + admin role',
      adminUserId,
      adminRole,
      totals: {
        users: usersTotal,
        venues: venuesTotal,
        staff: staffTotal,
        profiles: profilesTotal,
      },
      sections: [
        {
          key: 'users',
          label: 'Users',
          table: 'users',
          tableExists: usersTotal !== null,
          total: usersTotal,
          recent: recentUsers,
        },
        {
          key: 'venues',
          label: 'Venues',
          table: 'venues',
          tableExists: venuesTotal !== null,
          total: venuesTotal,
          recent: recentVenues,
        },
        {
          key: 'staff',
          label: 'Staff',
          table: 'staff',
          tableExists: staffTotal !== null,
          total: staffTotal,
          recent: recentStaff,
        },
        {
          key: 'profiles',
          label: 'Profiles',
          table: 'profiles',
          tableExists: profilesTotal !== null,
          total: profilesTotal,
          recent: recentProfiles,
        },
      ],
      limitations: {
        writeActions:
          'Read-only Admin HQ account operations endpoint for Phase 26. Suspend/approve/ban/edit actions must be added as separate audited admin actions before being marked GREEN.',
        passwordHash:
          'Password hashes are intentionally not returned.',
      },
    };
  }

  private adminHq61ProjectReport(row: any) {
    return {
      id: row?.id ?? null,
      reporterUserId: row?.reporterUserId ?? row?.reporter_user_id ?? null,
      targetType: row?.targetType ?? row?.target_type ?? null,
      targetId: row?.targetId ?? row?.target_id ?? null,
      reason: row?.reason ?? null,
      status: row?.status ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  private adminHq61ProjectBlock(row: any) {
    return {
      id: row?.id ?? null,
      blockerUserId: row?.blockerUserId ?? row?.blocker_user_id ?? null,
      blockedUserId: row?.blockedUserId ?? row?.blocked_user_id ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  private adminHq61ProjectAudit(row: any) {
    return {
      id: row?.id ?? null,
      actorUserId: row?.actorUserId ?? row?.actor_user_id ?? row?.userId ?? row?.user_id ?? null,
      action: row?.action ?? row?.eventType ?? row?.event_type ?? null,
      targetType: row?.targetType ?? row?.target_type ?? null,
      targetId: row?.targetId ?? row?.target_id ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  private adminHq61ProjectDeletion(row: any) {
    return {
      id: row?.id ?? null,
      userId: row?.userId ?? row?.user_id ?? null,
      email: row?.email ?? null,
      status: row?.status ?? null,
      reason: row?.reason ?? null,
      requestedAt: row?.requestedAt ?? row?.requested_at ?? row?.createdAt ?? row?.created_at ?? null,
      confirmedAt: row?.confirmedAt ?? row?.confirmed_at ?? null,
      resolvedAt: row?.resolvedAt ?? row?.resolved_at ?? null,
      createdAt: row?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('risk-trust-compliance')
  async adminHqRiskTrustCompliance(@Req() req: any) {
    this.assertAdmin(req);
    const adminUserId =
      Number(req?.user?.sub ?? req?.user?.id ?? req?.user?.userId ?? 0) || null;
    const adminRole = String(req?.user?.role ?? 'admin');

    const [
      reportsTotal,
      blocksTotal,
      auditTotal,
      accountDeletionTotal,
      recentReportsRaw,
      recentBlocksRaw,
      recentAuditRaw,
      recentDeletionRaw,
    ] = await Promise.all([
      this.adminHq46Count('user_reports'),
      this.adminHq46Count('user_blocks'),
      this.adminHq46Count('audit_events'),
      this.adminHq46Count('account_deletion_requests'),
      this.adminHq46Recent('user_reports', 10),
      this.adminHq46Recent('user_blocks', 10),
      this.adminHq46Recent('audit_events', 10),
      this.adminHq46Recent('account_deletion_requests', 10),
    ]);

    const reports = recentReportsRaw.map((row: any) =>
      this.adminHq61ProjectReport(row),
    );
    const blocks = recentBlocksRaw.map((row: any) =>
      this.adminHq61ProjectBlock(row),
    );
    const audit = recentAuditRaw.map((row: any) =>
      this.adminHq61ProjectAudit(row),
    );
    const accountDeletionRequests = recentDeletionRaw.map((row: any) =>
      this.adminHq61ProjectDeletion(row),
    );

    return {
      ok: true,
      scope: 'admin_hq_risk_trust_compliance',
      protectedBy: 'JwtAuthGuard + admin role',
      adminUserId,
      adminRole,
      totals: {
        reports: reportsTotal,
        blockedUsers: blocksTotal,
        auditEvents: auditTotal,
        accountDeletionRequests: accountDeletionTotal,
      },
      sections: [
        {
          key: 'reports',
          label: 'Safety reports',
          table: 'user_reports',
          tableExists: reportsTotal !== null,
          total: reportsTotal,
          recent: reports,
        },
        {
          key: 'blocks',
          label: 'Blocked users',
          table: 'user_blocks',
          tableExists: blocksTotal !== null,
          total: blocksTotal,
          recent: blocks,
        },
        {
          key: 'audit',
          label: 'Audit events',
          table: 'audit_events',
          tableExists: auditTotal !== null,
          total: auditTotal,
          recent: audit,
        },
        {
          key: 'account_deletion',
          label: 'Account deletion requests',
          table: 'account_deletion_requests',
          tableExists: accountDeletionTotal !== null,
          total: accountDeletionTotal,
          recent: accountDeletionRequests,
        },
      ],
      publicCompliancePages: [
        { key: 'safety_report', path: '/safety/report', type: 'public_html' },
        { key: 'compliance', path: '/compliance', type: 'public_html' },
        { key: 'data_export', path: '/data-export', type: 'public_html' },
        { key: 'account_delete', path: '/account-delete', type: 'public_html' },
      ],
      limitations: {
        writeActions:
          'Read-only Admin HQ risk/trust/compliance visibility. Case actions, report resolution, account deletion approval, bans, and policy controls require separate audited admin write endpoints before GREEN.',
        publicPages:
          'Public compliance HTML pages are listed for operational awareness only and are not used as Admin HQ JSON sources.',
      },
    };
  }

  private adminHq73String(value: any, fallback = '') {
    return String(value ?? fallback).trim();
  }

  private async adminHq73TableColumns(tableName: string): Promise<Set<string>> {
    try {
      const rows = await this.dataSource.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1`,
        [tableName],
      );
      return new Set((rows || []).map((row: any) => String(row.column_name || row.columnName || '').trim()).filter(Boolean));
    } catch {
      return new Set<string>();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('account-deletion/:id/action')
  async adminHq73AccountDeletionAction(
    @Req() req: any,
    @Param('id') idParam: string,
    @Body() body: any,
  ) {
    this.assertAdmin(req);

    const id = Number(idParam);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('invalid_account_deletion_request_id');
    }

    const action = this.adminHq73String(body?.action).toLowerCase();
    const adminNote = this.adminHq73String(body?.adminNote || body?.note || body?.reason, 'Admin action');

    if (action !== 'reject') {
      throw new BadRequestException('unsupported_account_deletion_admin_action');
    }

    const columns = await this.adminHq73TableColumns('account_deletion_requests');
    if (!columns.has('id') || !columns.has('status')) {
      throw new BadRequestException('account_deletion_requests_schema_not_ready');
    }

    const existingRows = await this.dataSource.query(
      `SELECT * FROM account_deletion_requests WHERE id = $1 LIMIT 1`,
      [id],
    );
    const existing = existingRows?.[0];

    if (!existing) {
      throw new BadRequestException('account_deletion_request_not_found');
    }

    const currentStatus = String(existing.status || '').toLowerCase();

    if (currentStatus === 'completed') {
      throw new BadRequestException('completed_account_deletion_cannot_be_changed');
    }

    if (currentStatus === 'rejected') {
      return {
        ok: true,
        id,
        status: 'rejected',
        alreadyRejected: true,
        action: 'reject',
        protectedBy: 'JwtAuthGuard + admin role',
      };
    }

    if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
      throw new BadRequestException('unsupported_account_deletion_status_transition');
    }

    const adminUserId = Number(req?.user?.sub ?? req?.user?.id ?? req?.user?.userId ?? 0) || null;
    const updateParts = [`status = $2`];
    const values: any[] = [id, 'rejected'];

    if (columns.has('reason')) {
      values.push(`ADMIN_REJECTED: ${adminNote}`);
      updateParts.push(`reason = $${values.length}`);
    }

    if (columns.has('resolvedAt')) {
      updateParts.push(`"resolvedAt" = NOW()`);
    } else if (columns.has('resolved_at')) {
      updateParts.push(`resolved_at = NOW()`);
    }

    if (columns.has('updatedAt')) {
      updateParts.push(`"updatedAt" = NOW()`);
    } else if (columns.has('updated_at')) {
      updateParts.push(`updated_at = NOW()`);
    }

    const updatedRows = await this.dataSource.query(
      `UPDATE account_deletion_requests SET ${updateParts.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    const updated = updatedRows?.[0] || null;

    return {
      ok: true,
      id,
      action: 'reject',
      status: updated?.status ?? 'rejected',
      previousStatus: currentStatus,
      adminUserId,
      adminNoteStored: columns.has('reason'),
      resolvedAtUpdated: columns.has('resolvedAt') || columns.has('resolved_at'),
      updatedAtUpdated: columns.has('updatedAt') || columns.has('updated_at'),
      protectedBy: 'JwtAuthGuard + admin role',
      limitation: 'This endpoint only rejects pending/confirmed account deletion requests. It does not approve or execute deletion.',
      item: this.adminHq61ProjectDeletion(updated),
    };
  }
}





