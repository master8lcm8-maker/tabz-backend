import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreeboardDrop } from './freeboard-drop.entity';
import { Venue } from '../venues/venue.entity';
import { FreeboardService } from './freeboard.service';
import { FreeboardController } from './freeboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreeboardDrop, Venue])],
  providers: [FreeboardService],
  controllers: [FreeboardController],
  exports: [FreeboardService],
})
export class FreeboardModule {}
