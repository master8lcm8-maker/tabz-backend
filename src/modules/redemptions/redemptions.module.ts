import { Module } from '@nestjs/common';

import { FoodsModule } from '../foods/foods.module';
import { QrModule } from '../qr/qr.module';

import { RedemptionsController } from './redemptions.controller';
import { RedemptionsService } from './redemptions.service';

@Module({
  imports: [
    QrModule,
    FoodsModule,
  ],
  controllers: [RedemptionsController],
  providers: [RedemptionsService],
  exports: [RedemptionsService],
})
export class RedemptionsModule {}
