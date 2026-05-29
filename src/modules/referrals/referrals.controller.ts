import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

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
  @Get('admin/overview')
  adminReferralOverview() {
    return this.referralsService.adminGetReferralOverview();
  }

  @Get('admin/links')
  adminReferralLinks(
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('ownerUserId') ownerUserId?: string,
  ) {
    return this.referralsService.adminListReferralLinks({
      limit: limit === undefined ? undefined : Number(limit),
      status: status ?? null,
      ownerUserId: ownerUserId === undefined ? null : Number(ownerUserId),
    });
  }

  @Get('admin/events')
  adminReferralEvents(
    @Query('limit') limit?: string,
    @Query('referralLinkId') referralLinkId?: string,
    @Query('eventType') eventType?: string,
    @Query('attributedUserId') attributedUserId?: string,
  ) {
    return this.referralsService.adminListReferralEvents({
      limit: limit === undefined ? undefined : Number(limit),
      referralLinkId: referralLinkId === undefined ? null : Number(referralLinkId),
      eventType: eventType ?? null,
      attributedUserId: attributedUserId === undefined ? null : Number(attributedUserId),
    });
  }
}
