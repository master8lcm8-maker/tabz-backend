import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DrinkOrder } from '../drinks/entities/drink-order.entity';
import { FreeboardDrop } from '../freeboard/freeboard-drop.entity';
import { FoodOrder } from '../foods/entities/food-order.entity';

import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrinkOrder,
      FreeboardDrop,
      FoodOrder,
    ]),
  ],
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
