import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  createPromotion(@Body() body: any) {
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

  @Patch(':id/approve')
  approvePromotion(@Param('id') id: string) {
    return this.promotionsService.approvePromotion(Number(id));
  }

  @Patch(':id/reject')
  rejectPromotion(@Param('id') id: string, @Body() body: any) {
    return this.promotionsService.rejectPromotion(Number(id), body?.reason);
  }

  @Patch(':id/activate')
  activatePromotion(@Param('id') id: string) {
    return this.promotionsService.activatePromotion(Number(id));
  }

  @Patch(':id/complete')
  completePromotion(@Param('id') id: string) {
    return this.promotionsService.completePromotion(Number(id));
  }

  @Patch(':id/cancel')
  cancelPromotion(@Param('id') id: string) {
    return this.promotionsService.cancelPromotion(Number(id));
  }

  @Post(':id/billing-events')
  recordBillingEvent(@Param('id') id: string, @Body() body: any) {
    return this.promotionsService.recordBillingEvent({
      ...body,
      promotionId: Number(id),
    });
  }

  @Post(':id/revenue-events')
  recordRevenueEvent(@Param('id') id: string, @Body() body: any) {
    return this.promotionsService.recordRevenueEvent({
      ...body,
      promotionId: Number(id),
    });
  }
}