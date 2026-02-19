import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { FreeboardService } from './freeboard.service';

@Injectable()
export class FreeboardSchedulerService {
  private readonly logger = new Logger(FreeboardSchedulerService.name);

  constructor(private readonly freeboardService: FreeboardService) {}

  // Runs frequently so expired drops don't linger as ACTIVE
  @Interval(30_000)
  async tick() {
    await this.freeboardService.cleanupExpiredDrops();
  }
}
