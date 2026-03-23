import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

type StripeRequest = Request & {
  rawBody?: Buffer;
};

@Controller('webhooks')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: StripeRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException('Missing raw Stripe request body');
    }

    await this.paymentsService.processWebhook(req.rawBody, signature);

    return { received: true };
  }
}