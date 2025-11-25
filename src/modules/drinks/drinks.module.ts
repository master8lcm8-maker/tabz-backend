import { Module } from '@nestjs/common';
import { DrinksController } from './drinks.controller';

@Module({
  controllers: [DrinksController],
})
export class DrinksModule {}
