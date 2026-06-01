import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // PROMOTION_WRITE_SECURITY_26M6
  private assertPromotionWriter(req: any) {
    const role = String(req?.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'owner') {
      throw new ForbiddenException('Only admins or owners can manage promotions.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createPromotion(@Req() req: any, @Body() body: any) {
    this.assertPromotionWriter(req);
    return this.promotionsService.createPromotion(body);
  }

  @Get()
  listPromotions() {
    return this.promotionsService.listPromotions();
  }

  @Get(':id')
  getPromotion(@Param('id') id: string) {
    return this.promotionsService.getPromotion(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  approvePromotion(@Req() req: any, @Param('id') id: string) {
    this.assertPromotionWriter(req);
    return this.promotionsService.approvePromotion(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  rejectPromotion(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertPromotionWriter(req);
    return this.promotionsService.rejectPromotion(Number(id), body?.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/activate')
  activatePromotion(@Req() req: any, @Param('id') id: string) {
    this.assertPromotionWriter(req);
    return this.promotionsService.activatePromotion(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/complete')
  completePromotion(@Req() req: any, @Param('id') id: string) {
    this.assertPromotionWriter(req);
    return this.promotionsService.completePromotion(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelPromotion(@Req() req: any, @Param('id') id: string) {
    this.assertPromotionWriter(req);
    return this.promotionsService.cancelPromotion(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/billing-events')
  recordBillingEvent(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertPromotionWriter(req);
    return this.promotionsService.recordBillingEvent({
      ...body,
      promotionId: Number(id),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/revenue-events')
  recordRevenueEvent(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertPromotionWriter(req);
    return this.promotionsService.recordRevenueEvent({
      ...body,
      promotionId: Number(id),
    });
  }
}
