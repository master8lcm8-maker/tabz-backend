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

  async record(userId: number, eventType: string) {
    const e = this.repo.create({ userId, eventType });
    return this.repo.save(e);
  }

  async mine(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { id: 'DESC' },
    });
  }
}
