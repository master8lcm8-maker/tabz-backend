import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EngagementEvent } from './engagement-event.entity';

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(EngagementEvent)
    private repo: Repository<EngagementEvent>,
  ) {}

  async record(
    userId: number,
    eventType: string,
    targetId?: string,
    metadata?: any,
  ) {
    const e = this.repo.create({ userId, eventType, targetId, metadata });
    return this.repo.save(e);
  }

  async mine(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { id: 'DESC' },
    });
  }
}
