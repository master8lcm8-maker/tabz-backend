import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './payments.controller';
import { PaymentsApiController } from './payments-api.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhookEvent } from './entities/stripe-webhook-event.entity';
import { DepositIntent } from './entities/deposit-intent.entity';
import { CashoutRequest } from '../../wallet/cashout-request.entity';
import { WalletModule } from '../../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StripeWebhookEvent, DepositIntent, CashoutRequest]),
    WalletModule,
  ],
  controllers: [PaymentsController, PaymentsApiController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
