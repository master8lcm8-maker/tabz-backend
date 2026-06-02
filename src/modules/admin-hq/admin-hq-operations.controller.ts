import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
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
}


