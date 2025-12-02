import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodOrder } from './entities/food-order.entity';
import { FoodsService } from './foods.service';
import { FoodsController } from './controllers/foods.controller';
import { Venue } from '../venues/venue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, Venue])],
  providers: [FoodsService],
  controllers: [FoodsController],
  exports: [FoodsService],
})
export class FoodsModule {}
