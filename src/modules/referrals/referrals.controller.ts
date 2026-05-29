import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
}