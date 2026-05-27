// src/modules/freeboard/freeboard.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { FreeboardDrop, FreeboardDropStatus } from './freeboard-drop.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class FreeboardService {
  constructor(
    @InjectRepository(FreeboardDrop)
    private readonly dropsRepo: Repository<FreeboardDrop>,
  ) {}

  async createDrop(input: {
    creatorId: number;
    venueId: number;
    title: string;
    description?: string;
    rewardCents?: number;
    expiresInMinutes?: number;
  }): Promise<FreeboardDrop> {
    const title = String(input?.title ?? '').trim();

    if (!title) {
      throw new BadRequestException('Title is required for a drop.');
    }

    const expiresInMinutes = Number(input?.expiresInMinutes ?? 60);
    if (!Number.isFinite(expiresInMinutes) || expiresInMinutes <= 0) {
      throw new BadRequestException('expiresInMinutes must be a positive number.');
    }

    const rewardCents = Number(input?.rewardCents ?? 0);
    if (!Number.isFinite(rewardCents) || rewardCents < 0) {
      throw new BadRequestException('rewardCents must be a non-negative number.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    const drop = this.dropsRepo.create({
      creatorId: input.creatorId,
      venueId: input.venueId,
      title,
      description: input.description ?? null,
      rewardCents: String(Math.trunc(rewardCents)),
      status: 'ACTIVE' as FreeboardDropStatus,
      claimCode: this.generateClaimCode(),
      expiresAt,
      claimedAt: null,
      claimedByUserId: null,
    });

    return this.dropsRepo.save(drop);
  }

  async claimDrop(input: {
    userId: number;
    code: string;
  }): Promise<FreeboardDrop> {
    const claimCode = String(input?.code ?? '').trim();

    if (!claimCode) {
      throw new BadRequestException('Claim code is required.');
    }

    const drop = await this.dropsRepo.findOne({
      where: { claimCode },
    });

    if (!drop) {
      throw new NotFoundException('Drop not found for that claim code.');
    }

    if (drop.status !== 'ACTIVE') {
      throw new BadRequestException('Drop is not active.');
    }

    if (drop.expiresAt && drop.expiresAt < new Date()) {
      drop.status = 'EXPIRED';
      await this.dropsRepo.save(drop);
      throw new BadRequestException('Drop has expired.');
    }

    drop.status = 'CLAIMED';
    drop.claimedAt = new Date();
    drop.claimedByUserId = input.userId;

    return this.dropsRepo.save(drop);
  }

  async getDropsForVenue(venueId: number): Promise<FreeboardDrop[]> {
    return this.dropsRepo.find({
      where: {
        venueId,
        status: 'ACTIVE',
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getDropsForCreator(creatorId: number): Promise<FreeboardDrop[]> {
    return this.dropsRepo.find({
      where: {
        creatorId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupExpiredDrops(): Promise<void> {
    const now = new Date();

    const expired = await this.dropsRepo.find({
      where: {
        status: 'ACTIVE',
        expiresAt: LessThan(now),
      },
    });

    if (!expired.length) return;

    for (const drop of expired) {
      drop.status = 'EXPIRED';
    }

    await this.dropsRepo.save(expired);
  }

  private generateClaimCode(): string {
    // short code, uppercased hex, e.g. "007A6250"
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
