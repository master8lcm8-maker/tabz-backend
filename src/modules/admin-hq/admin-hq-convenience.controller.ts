import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin-hq')
export class AdminHqConvenienceController {
  private assertAdmin(req: any) {
    const user = req?.user || {};

    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can access Admin HQ convenience routes.');
    }

    return {
      adminId: Number(user.userId || user.id || user.sub || 0),
      role: user.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('control')
  control(@Req() req: any) {
    const admin = this.assertAdmin(req);

    return {
      ok: true,
      facade: 'admin-hq/control',
      source: 'admin control routes',
      scope: 'admin_hq_control_convenience',
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
      note: 'Phase 26R repair facade for /admin-hq/control only.',
    };
  }
}
