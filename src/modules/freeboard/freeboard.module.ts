import { Module } from '@nestjs/common';
import { FreeboardController } from './freeboard.controller';

@Module({
  controllers: [FreeboardController],
})
export class FreeboardModule {}
