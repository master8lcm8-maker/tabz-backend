import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class AdminConvenienceController {
  private assertAdmin(req: any) {
    const user = req?.user || {};

    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can access admin convenience routes.');
    }

    return {
      adminId: Number(user.userId || user.id || user.sub || 0),
      role: user.role,
    };
  }

  private payload(req: any, facade: string, source: string, scope: string) {
    const admin = this.assertAdmin(req);

    return {
      ok: true,
      facade,
      source,
      scope,
      adminId: admin.adminId,
      role: admin.role,
      canonicalRoutes: {
        operations: '/admin-hq/operations',
        refunds: '/admin/refunds',
        disputes: '/admin/disputes',
        finalResolution: '/admin/final-resolution',
        payouts: '/admin/payouts',
        stripeEvents: '/admin/stripe-events',
      },
      note: 'Phase 26R admin convenience facade over existing protected Admin HQ routes.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/operations')
  adminOperations(@Req() req: any) {
    return this.payload(req, 'admin/operations', 'admin-hq/operations', 'admin_operations_convenience');
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/control')
  adminControl(@Req() req: any) {
    return this.payload(req, 'admin/control', 'admin control routes', 'admin_control_convenience');
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/overview')
  adminOverview(@Req() req: any) {
    return this.payload(req, 'admin/overview', 'admin-hq/operations', 'admin_overview_convenience');
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin-hq/control')
  adminHqControl(@Req() req: any) {
    return this.payload(req, 'admin-hq/control', 'admin control routes', 'admin_hq_control_convenience');
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin-hq/overview')
  adminHqOverview(@Req() req: any) {
    return this.payload(req, 'admin-hq/overview', 'admin-hq/operations', 'admin_hq_overview_convenience');
  }
}
