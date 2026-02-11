import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngagementEvent } from './engagement-event.entity';
import { EngagementService } from './engagement.service';
import { EngagementController } from './engagement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EngagementEvent])],
  providers: [EngagementService],
  controllers: [EngagementController],
})
export class EngagementModule {}
