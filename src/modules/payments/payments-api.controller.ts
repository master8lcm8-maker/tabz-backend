import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

type CreatePaymentIntentDto = {
  userId: number;
  amountCents: number;
  currency?: string;
};

@Controller('payments')
export class PaymentsApiController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/payment-intents')
  async createPaymentIntent(@Body() body: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(body);
  }
}