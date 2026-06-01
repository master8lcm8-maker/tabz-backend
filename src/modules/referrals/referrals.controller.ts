import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // REFERRALS_ADMIN_ONLY_26K1N
  private assertAdmin(req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      throw new ForbiddenException('Only admins can access referral admin routes.');
    }
  }

  @Post('links')
  createReferralLink(@Body() body: any) {
    return this.referralsService.createReferralLink(body);
  }

  @Get('links/:code')
  resolveReferralLink(@Param('code') code: string) {
    return this.referralsService.resolveReferralLink(code);
  }

  @Post('events/click')
  recordClick(@Body() body: any) {
    return this.referralsService.recordClick(body);
  }

  @Post('events/signup')
  recordSignup(@Body() body: any) {
    return this.referralsService.recordSignup(body);
  }
  @UseGuards(JwtAuthGuard)
  @Get('admin/overview')
  adminReferralOverview(@Req() req: any) {
    this.assertAdmin(req);
    return this.referralsService.adminGetReferralOverview();
  }
  @UseGuards(JwtAuthGuard)
  @Get('admin/links')
  adminReferralLinks(
    @Req() req: any,@Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('ownerUserId') ownerUserId?: string,
  ) {
    this.assertAdmin(req);
    return this.referralsService.adminListReferralLinks({
      limit: limit === undefined ? undefined : Number(limit),
      status: status ?? null,
      ownerUserId: ownerUserId === undefined ? null : Number(ownerUserId),
    });
  }
  @UseGuards(JwtAuthGuard)
  @Get('admin/events')
  adminReferralEvents(
    @Req() req: any,@Query('limit') limit?: string,
    @Query('referralLinkId') referralLinkId?: string,
    @Query('eventType') eventType?: string,
    @Query('attributedUserId') attributedUserId?: string,
  ) {
    this.assertAdmin(req);
    return this.referralsService.adminListReferralEvents({
      limit: limit === undefined ? undefined : Number(limit),
      referralLinkId: referralLinkId === undefined ? null : Number(referralLinkId),
      eventType: eventType ?? null,
      attributedUserId: attributedUserId === undefined ? null : Number(attributedUserId),
    });
  }
}


