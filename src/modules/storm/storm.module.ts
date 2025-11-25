import { Module } from '@nestjs/common';
import { StormController } from './storm.controller';

@Module({
  controllers: [StormController],
})
export class StormModule {}
